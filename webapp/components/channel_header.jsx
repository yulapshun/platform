// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import $ from 'jquery';
import 'bootstrap';
import NavbarSearchBox from './search_bar.jsx';
import MessageWrapper from './message_wrapper.jsx';
import PopoverListMembers from './popover_list_members.jsx';
import EditChannelHeaderModal from './edit_channel_header_modal.jsx';
import EditChannelPurposeModal from './edit_channel_purpose_modal.jsx';
import ChannelInfoModal from './channel_info_modal.jsx';
import ChannelInviteModal from './channel_invite_modal.jsx';
import ChannelMembersModal from './channel_members_modal.jsx';
import ChannelNotificationsModal from './channel_notifications_modal.jsx';
import DeleteChannelModal from './delete_channel_modal.jsx';
import RenameChannelModal from './rename_channel_modal.jsx';
import ToggleModalButton from './toggle_modal_button.jsx';

import ChannelStore from 'stores/channel_store.jsx';
import UserStore from 'stores/user_store.jsx';
import TeamStore from 'stores/team_store.jsx';
import SearchStore from 'stores/search_store.jsx';
import CugcStore from 'stores/cugc_store.jsx';
import PreferenceStore from 'stores/preference_store.jsx';
import WebrtcStore from 'stores/webrtc_store.jsx';

import * as GlobalActions from 'actions/global_actions.jsx';
import * as WebrtcActions from 'actions/webrtc_actions.jsx';
import * as ChannelActions from 'actions/channel_actions.jsx';
import * as Utils from 'utils/utils.jsx';
import * as ChannelUtils from 'utils/channel_utils.jsx';
import * as TextFormatting from 'utils/text_formatting.jsx';
import Client from 'client/web_client.jsx';
import * as AsyncClient from 'utils/async_client.jsx';
import {getFlaggedPosts} from 'actions/post_actions.jsx';
import {getAllCugcInfo} from 'actions/cugc_actions.jsx';

import {Constants, Preferences, UserStatuses} from 'utils/constants.jsx';

import React from 'react';
import {FormattedMessage} from 'react-intl';
import {browserHistory} from 'react-router/es6';
import {Tooltip, OverlayTrigger, Popover} from 'react-bootstrap';

const PreReleaseFeatures = Constants.PRE_RELEASE_FEATURES;

export default class ChannelHeader extends React.Component {
    constructor(props) {
        super(props);

        this.onListenerChange = this.onListenerChange.bind(this);
        this.handleLeave = this.handleLeave.bind(this);
        this.searchMentions = this.searchMentions.bind(this);
        this.showRenameChannelModal = this.showRenameChannelModal.bind(this);
        this.hideRenameChannelModal = this.hideRenameChannelModal.bind(this);
        this.handleShortcut = this.handleShortcut.bind(this);
        this.getFlagged = this.getFlagged.bind(this);
        this.getCugcInfo = this.getCugcInfo.bind(this);
        this.initWebrtc = this.initWebrtc.bind(this);
        this.onBusy = this.onBusy.bind(this);

        const state = this.getStateFromStores();
        state.showEditChannelPurposeModal = false;
        state.showMembersModal = false;
        state.showRenameChannelModal = false;
        this.state = state;
    }

    getStateFromStores() {
        const channel = ChannelStore.get(this.props.channelId);
        const stats = ChannelStore.getStats(this.props.channelId);
        const users = UserStore.getProfileListInChannel(this.props.channelId);
        const cugcInfo = CugcStore.getCugcInfo();

        let otherUserId = null;
        if (channel && channel.type === 'D') {
            otherUserId = Utils.getUserIdFromChannelName(channel);
        }

        return {
            channel,
            memberChannel: ChannelStore.getMyMember(this.props.channelId),
            users,
            cugcInfo,
            userCount: stats.member_count,
            currentUser: UserStore.getCurrentUser(),
            otherUserId,
            enableFormatting: PreferenceStore.getBool(Preferences.CATEGORY_ADVANCED_SETTINGS, 'formatting', true),
            isBusy: WebrtcStore.isBusy(),
            isFavorite: channel && ChannelUtils.isFavoriteChannel(channel)
        };
    }

    validState() {
        if (!this.state.channel ||
            !this.state.memberChannel ||
            !this.state.users ||
            !this.state.userCount ||
            !this.state.currentUser) {
            return false;
        }
        return true;
    }

    componentDidMount() {
        ChannelStore.addChangeListener(this.onListenerChange);
        ChannelStore.addStatsChangeListener(this.onListenerChange);
        SearchStore.addSearchChangeListener(this.onListenerChange);
        CugcStore.addChangeListener(this.onListenerChange);
        PreferenceStore.addChangeListener(this.onListenerChange);
        UserStore.addInChannelChangeListener(this.onListenerChange);
        UserStore.addStatusesChangeListener(this.onListenerChange);
        WebrtcStore.addChangedListener(this.onListenerChange);
        WebrtcStore.addBusyListener(this.onBusy);
        $('.sidebar--left .dropdown-menu').perfectScrollbar();
        document.addEventListener('keydown', this.handleShortcut);
    }

    componentWillUnmount() {
        ChannelStore.removeChangeListener(this.onListenerChange);
        ChannelStore.removeStatsChangeListener(this.onListenerChange);
        SearchStore.removeSearchChangeListener(this.onListenerChange);
        CugcStore.removeChangeListener(this.onListenerChange);
        PreferenceStore.removeChangeListener(this.onListenerChange);
        UserStore.removeInChannelChangeListener(this.onListenerChange);
        UserStore.removeStatusesChangeListener(this.onListenerChange);
        WebrtcStore.removeChangedListener(this.onListenerChange);
        WebrtcStore.removeBusyListener(this.onBusy);
        document.removeEventListener('keydown', this.handleShortcut);
    }

    shouldComponentUpdate(nextProps) {
        return Boolean(nextProps.channelId);
    }

    onListenerChange() {
        console.log("hihi.state: ", this.getStateFromStores());
        this.setState(this.getStateFromStores());
    }

    handleLeave() {
        Client.leaveChannel(this.state.channel.id,
            () => {
                const channelId = this.state.channel.id;

                if (this.state.isFavorite) {
                    ChannelActions.unmarkFavorite(channelId);
                }

                const townsquare = ChannelStore.getByName('town-square');
                browserHistory.push(TeamStore.getCurrentTeamRelativeUrl() + '/channels/' + townsquare.name);
            },
            (err) => {
                AsyncClient.dispatchError(err, 'handleLeave');
            }
        );
    }

    toggleFavorite = (e) => {
        e.preventDefault();

        if (this.state.isFavorite) {
            ChannelActions.unmarkFavorite(this.state.channel.id);
        } else {
            ChannelActions.markFavorite(this.state.channel.id);
        }
    };

    searchMentions(e) {
        e.preventDefault();
        const user = this.state.currentUser;
        if (SearchStore.isMentionSearch) {
            // Close
            GlobalActions.toggleSideBarAction(false);
        } else {
            GlobalActions.emitSearchMentionsEvent(user);
        }
    }

    getFlagged(e) {
        e.preventDefault();
        if (SearchStore.isFlaggedPosts) {
            GlobalActions.toggleSideBarAction(false);
        } else {
            getFlaggedPosts();
        }
    }

    getCugcInfo(e) {
        e.preventDefault();
        console.log("This is channel");
        getAllCugcInfo();
        // do nothing
    }

    handleShortcut(e) {
        if (Utils.cmdOrCtrlPressed(e) && e.shiftKey) {
            if (e.keyCode === Constants.KeyCodes.M) {
                e.preventDefault();
                this.searchMentions(e);
            }
        }
    }

    showRenameChannelModal(e) {
        e.preventDefault();

        this.setState({
            showRenameChannelModal: true
        });
    }

    hideRenameChannelModal() {
        this.setState({
            showRenameChannelModal: false
        });
    }

    initWebrtc(contactId, isOnline) {
        if (isOnline && !this.state.isBusy) {
            GlobalActions.emitCloseRightHandSide();
            WebrtcActions.initWebrtc(contactId, true);
        }
    }

    onBusy(isBusy) {
        this.setState({isBusy});
    }

    render() {
        const flagIcon = Constants.FLAG_ICON_SVG;

        if (!this.validState()) {
            // Use an empty div to make sure the header's height stays constant
            return (
                <div className='channel-header'/>
            );
        }

        const channel = this.state.channel;
        const recentMentionsTooltip = (
            <Tooltip id='recentMentionsTooltip'>
                <FormattedMessage
                    id='channel_header.recentMentions'
                    defaultMessage='Recent Mentions'
                />
            </Tooltip>
        );

        const flaggedTooltip = (
            <Tooltip id='flaggedTooltip'>
                <FormattedMessage
                    id='channel_header.flagged'
                    defaultMessage='Flagged Posts'
                />
            </Tooltip>
        );

        const cugcInfoViewTooltip = (
            <Tooltip id='flaggedTooltip'>
                <FormattedMessage
                    id='channel_header.info'
                    defaultMessage='Info'
                />
            </Tooltip>
        );

        const popoverContent = (
            <Popover
                id='header-popover'
                bStyle='info'
                bSize='large'
                placement='bottom'
                className='description'
                onMouseOver={() => this.refs.headerOverlay.show()}
                onMouseOut={() => this.refs.headerOverlay.hide()}
            >
                <MessageWrapper
                    message={channel.header}
                />
            </Popover>
        );
        let channelTitle = channel.display_name;
        const isAdmin = TeamStore.isTeamAdminForCurrentTeam() || UserStore.isSystemAdminForCurrentUser();
        const isSystemAdmin = UserStore.isSystemAdminForCurrentUser();
        const isDirect = (this.state.channel.type === 'D');
        let webrtc;

        if (isDirect) {
            const userMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            const otherUserId = this.state.otherUserId;

            const teammateId = Utils.getUserIdFromChannelName(channel);
            channelTitle = Utils.displayUsername(teammateId);

            const webrtcEnabled = global.mm_config.EnableWebrtc === 'true' && userMedia && Utils.isFeatureEnabled(PreReleaseFeatures.WEBRTC_PREVIEW);

            if (webrtcEnabled) {
                const isOffline = UserStore.getStatus(otherUserId) === UserStatuses.OFFLINE;
                const busy = this.state.isBusy;
                let circleClass = '';
                let webrtcMessage;

                if (isOffline || busy) {
                    circleClass = 'offline';
                    webrtcMessage = (
                        <FormattedMessage
                            id='channel_header.webrtc.offline'
                            defaultMessage='The user is offline'
                        />
                    );

                    if (busy) {
                        webrtcMessage = (
                            <FormattedMessage
                                id='channel_header.webrtc.unavailable'
                                defaultMessage='New call unavailable until your existing call ends'
                            />
                        );
                    }
                } else {
                    webrtcMessage = (
                        <FormattedMessage
                            id='channel_header.webrtc.call'
                            defaultMessage='Start Video Call'
                        />
                    );
                }

                const webrtcTooltip = (
                    <Tooltip id='webrtcTooltip'>{webrtcMessage}</Tooltip>
                );

                webrtc = (
                    <div className='webrtc__header'>
                        <a
                            href='#'
                            onClick={() => this.initWebrtc(otherUserId, !isOffline)}
                            disabled={isOffline}
                        >
                            <OverlayTrigger
                                delayShow={Constants.WEBRTC_TIME_DELAY}
                                placement='bottom'
                                overlay={webrtcTooltip}
                            >
                                <div
                                    id='webrtc-btn'
                                    className={'webrtc__button ' + circleClass}
                                >
                                    <span dangerouslySetInnerHTML={{__html: Constants.VIDEO_ICON}}/>
                                </div>
                            </OverlayTrigger>
                        </a>
                    </div>
                );
            }
        }

        let channelTerm = (
            <FormattedMessage
                id='channel_header.channel'
                defaultMessage='Channel'
            />
        );
        if (channel.type === Constants.PRIVATE_CHANNEL) {
            channelTerm = (
                <FormattedMessage
                    id='channel_header.group'
                    defaultMessage='Group'
                />
            );
        }

        let popoverListMembers;
        if (!isDirect) {
            popoverListMembers = (
                <PopoverListMembers
                    channel={channel}
                    members={this.state.users}
                    memberCount={this.state.userCount}
                />
            );
        }

        const dropdownContents = [];
        if (isDirect) {
            dropdownContents.push(
                <li
                    key='edit_header_direct'
                    role='presentation'
                >
                    <ToggleModalButton
                        role='menuitem'
                        dialogType={EditChannelHeaderModal}
                        dialogProps={{channel}}
                    >
                        <FormattedMessage
                            id='channel_header.channelHeader'
                            defaultMessage='Edit Channel Header'
                        />
                    </ToggleModalButton>
                </li>
            );
        } else {
            dropdownContents.push(
                <li
                    key='view_info'
                    role='presentation'
                >
                    <ToggleModalButton
                        role='menuitem'
                        dialogType={ChannelInfoModal}
                        dialogProps={{channel}}
                    >
                        <FormattedMessage
                            id='channel_header.viewInfo'
                            defaultMessage='View Info'
                        />
                    </ToggleModalButton>
                </li>
            );

            dropdownContents.push(
                <li
                    key='notification_preferences'
                    role='presentation'
                >
                    <ToggleModalButton
                        role='menuitem'
                        dialogType={ChannelNotificationsModal}
                        dialogProps={{
                            channel,
                            channelMember: this.state.memberChannel,
                            currentUser: this.state.currentUser
                        }}
                    >
                        <FormattedMessage
                            id='channel_header.notificationPreferences'
                            defaultMessage='Notification Preferences'
                        />
                    </ToggleModalButton>
                </li>
            );

            dropdownContents.push(
                <li
                    key='divider-1'
                    className='divider'
                />
            );

            if (!ChannelStore.isDefault(channel)) {
                dropdownContents.push(
                    <li
                        key='add_members'
                        role='presentation'
                    >
                        <ToggleModalButton
                            ref='channelInviteModalButton'
                            role='menuitem'
                            dialogType={ChannelInviteModal}
                            dialogProps={{channel, currentUser: this.state.currentUser}}
                        >
                            <FormattedMessage
                                id='chanel_header.addMembers'
                                defaultMessage='Add Members'
                            />
                        </ToggleModalButton>
                    </li>
                );

                dropdownContents.push(
                    <li
                        key='manage_members'
                        role='presentation'
                    >
                        <a
                            role='menuitem'
                            href='#'
                            onClick={() => this.setState({showMembersModal: true})}
                        >
                            <FormattedMessage
                                id='channel_header.manageMembers'
                                defaultMessage='Manage Members'
                            />
                        </a>
                    </li>
                );
            }

            dropdownContents.push(
                <li
                    key='divider-2'
                    className='divider'
                />
            );

            const deleteOption = (
                <li
                    key='delete_channel'
                    role='presentation'
                >
                    <ToggleModalButton
                        role='menuitem'
                        dialogType={DeleteChannelModal}
                        dialogProps={{channel}}
                    >
                        <FormattedMessage
                            id='channel_header.delete'
                            defaultMessage='Delete {term}'
                            values={{
                                term: (channelTerm)
                            }}
                        />
                    </ToggleModalButton>
                </li>
            );

            if (ChannelUtils.showManagementOptions(channel, isAdmin, isSystemAdmin)) {
                dropdownContents.push(
                    <li
                        key='set_channel_header'
                        role='presentation'
                    >
                        <ToggleModalButton
                            role='menuitem'
                            dialogType={EditChannelHeaderModal}
                            dialogProps={{channel}}
                        >
                            <FormattedMessage
                                id='channel_header.setHeader'
                                defaultMessage='Edit {term} Header'
                                values={{
                                    term: (channelTerm)
                                }}
                            />
                        </ToggleModalButton>
                    </li>
                );

                dropdownContents.push(
                    <li
                        key='set_channel_purpose'
                        role='presentation'
                    >
                        <a
                            role='menuitem'
                            href='#'
                            onClick={() => this.setState({showEditChannelPurposeModal: true})}
                        >
                            <FormattedMessage
                                id='channel_header.setPurpose'
                                defaultMessage='Edit {term} Purpose'
                                values={{
                                    term: (channelTerm)
                                }}
                            />
                        </a>
                    </li>
                );

                dropdownContents.push(
                    <li
                        key='rename_channel'
                        role='presentation'
                    >
                        <a
                            role='menuitem'
                            href='#'
                            onClick={this.showRenameChannelModal}
                        >
                            <FormattedMessage
                                id='channel_header.rename'
                                defaultMessage='Rename {term}'
                                values={{
                                    term: (channelTerm)
                                }}
                            />
                        </a>
                    </li>
                );
            }

            if (ChannelUtils.showDeleteOption(channel, isAdmin, isSystemAdmin)) {
                if (!ChannelStore.isDefault(channel)) {
                    dropdownContents.push(deleteOption);
                }
            } else if (this.state.userCount === 1) {
                dropdownContents.push(deleteOption);
            }

            dropdownContents.push(
                <li
                    key='divider-3'
                    className='divider'
                />
            );

            const canLeave = channel.type === Constants.PRIVATE_CHANNEL ? this.state.userCount > 1 : true;
            if (!ChannelStore.isDefault(channel) && canLeave) {
                dropdownContents.push(
                    <li
                        key='leave_channel'
                        role='presentation'
                    >
                        <a
                            role='menuitem'
                            href='#'
                            onClick={this.handleLeave}
                        >
                            <FormattedMessage
                                id='channel_header.leave'
                                defaultMessage='Leave {term}'
                                values={{
                                    term: (channelTerm)
                                }}
                            />
                        </a>
                    </li>
                );
            }
        }

        let headerText;
        if (this.state.enableFormatting) {
            headerText = TextFormatting.formatText(channel.header, {singleline: true, mentionHighlight: false, siteURL: Utils.getSiteURL()});
        } else {
            headerText = channel.header;
        }

        const toggleFavoriteTooltip = (
            <Tooltip id='favoriteTooltip'>
                {this.state.isFavorite ?
                    <FormattedMessage
                        id='channelHeader.removeFromFavorites'
                        defaultMessage='Remove from Favorites'
                    /> :
                        <FormattedMessage
                            id='channelHeader.addToFavorites'
                            defaultMessage='Add to Favorites'
                        />}
            </Tooltip>
        );
        const toggleFavorite = (
            <OverlayTrigger
                delayShow={Constants.OVERLAY_TIME_DELAY}
                placement='bottom'
                overlay={toggleFavoriteTooltip}
            >
                <a
                    href='#'
                    onClick={this.toggleFavorite}
                    className='channel-header__favorites'
                >
                    <i className={'icon fa ' + (this.state.isFavorite ? 'fa-star' : 'fa-star-o')}/>
                </a>
            </OverlayTrigger>
        );

        let channelMembersModal;
        if (this.state.showMembersModal && channel.name !== Constants.DEFAULT_CHANNEL) {
            channelMembersModal = (
                <ChannelMembersModal
                    onModalDismissed={() => this.setState({showMembersModal: false})}
                    showInviteModal={() => this.refs.channelInviteModalButton.show()}
                    channel={channel}
                />
            );
        }

        let editPurposeModal;
        if (this.state.showEditChannelPurposeModal) {
            editPurposeModal = (
                <EditChannelPurposeModal
                    onModalDismissed={() => this.setState({showEditChannelPurposeModal: false})}
                    channel={channel}
                />
            );
        }

        return (
            <div
                id='channel-header'
                className='channel-header'
            >
                <table className='channel-header alt'>
                    <tbody>
                        <tr>
                            <th>
                                <div className='channel-header__info'>
                                    {webrtc}
                                    {toggleFavorite}
                                    <div className='dropdown'>
                                        <a
                                            href='#'
                                            className='dropdown-toggle theme'
                                            type='button'
                                            id='channel_header_dropdown'
                                            data-toggle='dropdown'
                                            aria-expanded='true'
                                        >
                                            <strong className='heading'>{channelTitle} </strong>
                                            <span className='fa fa-chevron-down header-dropdown__icon'/>
                                        </a>
                                        <ul
                                            className='dropdown-menu'
                                            role='menu'
                                            aria-labelledby='channel_header_dropdown'
                                        >
                                            {dropdownContents}
                                        </ul>
                                    </div>
                                    <OverlayTrigger
                                        trigger={'click'}
                                        placement='bottom'
                                        rootClose={true}
                                        overlay={popoverContent}
                                        ref='headerOverlay'
                                    >
                                        <div
                                            onClick={Utils.handleFormattedTextClick}
                                            className='description'
                                            dangerouslySetInnerHTML={{__html: headerText}}
                                        />
                                    </OverlayTrigger>
                                </div>
                            </th>
                            <th className='header-list__members'>
                                {popoverListMembers}
                            </th>
                            <th className='search-bar__container'><NavbarSearchBox showMentionFlagBtns={false}/></th>
                            <th>
                                <div className='dropdown channel-header__links search-btns'>
                                    <OverlayTrigger
                                        delayShow={Constants.OVERLAY_TIME_DELAY}
                                        placement='bottom'
                                        overlay={recentMentionsTooltip}
                                    >
                                        <a
                                            href='#'
                                            type='button'
                                            onClick={this.searchMentions}
                                        >
                                            {'@'}
                                        </a>
                                    </OverlayTrigger>
                                </div>
                            </th>
                            <th>
                                <div className='dropdown channel-header__links search-btns'>
                                    <OverlayTrigger
                                        delayShow={Constants.OVERLAY_TIME_DELAY}
                                        placement='bottom'
                                        overlay={flaggedTooltip}
                                    >
                                        <a
                                            href='#'
                                            type='button'
                                            onClick={this.getFlagged}
                                        >
                                            <span
                                                className='icon icon__flag'
                                                dangerouslySetInnerHTML={{__html: flagIcon}}
                                            />
                                        </a>
                                    </OverlayTrigger>
                                </div>
                            </th>
                            <th>
                                <div className='dropdown channel-header__links search-btns'>
                                    <OverlayTrigger
                                        delayShow={Constants.OVERLAY_TIME_DELAY}
                                        placement='bottom'
                                        overlay={cugcInfoViewTooltip}
                                    >
                                        <a
                                            href='#'
                                            type='button'
                                            onClick={this.getCugcInfo}
                                        >
                                            {'I'}
                                        </a>
                                    </OverlayTrigger>
                                </div>
                            </th>
                        </tr>
                    </tbody>
                </table>
                {editPurposeModal}
                {channelMembersModal}
                <RenameChannelModal
                    show={this.state.showRenameChannelModal}
                    onHide={this.hideRenameChannelModal}
                    channel={channel}
                />
            </div>
        );
    }
}

ChannelHeader.propTypes = {
    channelId: React.PropTypes.string.isRequired
};
