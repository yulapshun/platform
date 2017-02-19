// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import SearchResultsHeader from './search_results_header.jsx';
import SearchResultsItem from './search_results_item.jsx';
import SearchBox from './search_bar.jsx';

import ChannelStore from 'stores/channel_store.jsx';
import SearchStore from 'stores/search_store.jsx';
import UserStore from 'stores/user_store.jsx';
import PreferenceStore from 'stores/preference_store.jsx';
import WebrtcStore from 'stores/webrtc_store.jsx';

import * as Utils from 'utils/utils.jsx';
import Constants from 'utils/constants.jsx';
const Preferences = Constants.Preferences;

import $ from 'jquery';
import React from 'react';
import {FormattedMessage, FormattedHTMLMessage} from 'react-intl';

function getStateFromStores() {
    const results = JSON.parse(JSON.stringify(SearchStore.getSearchResults()));

    const channels = new Map();

    if (results && results.order) {
        const channelIds = results.order.map((postId) => results.posts[postId].channel_id);
        for (const id of channelIds) {
            if (channels.has(id)) {
                continue;
            }

            channels.set(id, ChannelStore.get(id));
        }
    }

    return {
        results,
        channels,
        searchTerm: SearchStore.getSearchTerm(),
        flaggedPosts: PreferenceStore.getCategory(Constants.Preferences.CATEGORY_FLAGGED_POST)
    };
}

export default class CugcInfoView extends React.Component {
    constructor(props) {
        super(props);

        this.mounted = false;

        this.onChange = this.onChange.bind(this);
        this.onUserChange = this.onUserChange.bind(this);
        this.onPreferenceChange = this.onPreferenceChange.bind(this);
        this.onBusy = this.onBusy.bind(this);
        this.resize = this.resize.bind(this);
        this.onPreferenceChange = this.onPreferenceChange.bind(this);
        this.onStatusChange = this.onStatusChange.bind(this);
        this.handleResize = this.handleResize.bind(this);

        const state = getStateFromStores();
        state.windowWidth = Utils.windowWidth();
        state.windowHeight = Utils.windowHeight();
        state.profiles = JSON.parse(JSON.stringify(UserStore.getProfiles()));
        state.compactDisplay = PreferenceStore.get(Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.MESSAGE_DISPLAY, Preferences.MESSAGE_DISPLAY_DEFAULT) === Preferences.MESSAGE_DISPLAY_COMPACT;
        state.isBusy = WebrtcStore.isBusy();
        state.statuses = Object.assign({}, UserStore.getStatuses());
        this.state = state;
    }

    componentDidMount() {
        this.mounted = true;

        SearchStore.addSearchChangeListener(this.onChange);
        ChannelStore.addChangeListener(this.onChange);
        PreferenceStore.addChangeListener(this.onPreferenceChange);
        UserStore.addChangeListener(this.onUserChange);
        UserStore.addStatusesChangeListener(this.onStatusChange);
        PreferenceStore.addChangeListener(this.onPreferenceChange);
        WebrtcStore.addBusyListener(this.onBusy);

        this.resize();
        window.addEventListener('resize', this.handleResize);
        if (!Utils.isMobile()) {
            $('.sidebar--right .search-items-container').perfectScrollbar();
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        if (!Utils.areObjectsEqual(nextState.statuses, this.state.statuses)) {
            return true;
        }

        if (!Utils.areObjectsEqual(this.props, nextProps)) {
            return true;
        }

        if (!Utils.areObjectsEqual(this.state, nextState)) {
            return true;
        }

        if (nextState.compactDisplay !== this.state.compactDisplay) {
            return true;
        }

        if (nextState.isBusy !== this.state.isBusy) {
            return true;
        }

        return false;
    }

    componentWillUnmount() {
        this.mounted = false;

        SearchStore.removeSearchChangeListener(this.onChange);
        ChannelStore.removeChangeListener(this.onChange);
        PreferenceStore.removeChangeListener(this.onPreferenceChange);
        UserStore.removeChangeListener(this.onUserChange);
        UserStore.removeStatusesChangeListener(this.onStatusChange);
        PreferenceStore.removeChangeListener(this.onPreferenceChange);
        WebrtcStore.removeBusyListener(this.onBusy);

        window.removeEventListener('resize', this.handleResize);
    }

    handleResize() {
        this.setState({
            windowWidth: Utils.windowWidth(),
            windowHeight: Utils.windowHeight()
        });
    }

    onPreferenceChange() {
        this.setState({
            compactDisplay: PreferenceStore.get(Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.MESSAGE_DISPLAY, Preferences.MESSAGE_DISPLAY_DEFAULT) === Preferences.MESSAGE_DISPLAY_COMPACT,
            flaggedPosts: PreferenceStore.getCategory(Constants.Preferences.CATEGORY_FLAGGED_POST)
        });
    }

    onChange() {
        if (this.mounted) {
            this.setState(getStateFromStores());
        }
    }

    onUserChange() {
        this.setState({profiles: JSON.parse(JSON.stringify(UserStore.getProfiles()))});
    }

    onBusy(isBusy) {
        this.setState({isBusy});
    }

    onStatusChange() {
        this.setState({statuses: Object.assign({}, UserStore.getStatuses())});
    }

    resize() {
        $('#search-items-container').scrollTop(0);
    }

    render() {
        var results = this.state.results;
        var currentId = UserStore.getCurrentId();
        var searchForm = null;
        if (currentId) {
            searchForm = <SearchBox/>;
        }
        var noResults = (!results || !results.order || !results.order.length);
        const searchTerm = this.state.searchTerm;
        const profiles = this.state.profiles || {};
        const flagIcon = Constants.FLAG_ICON_SVG;

        return (
            <div className='sidebar--right__content'>
                <div className='search-bar__container sidebar--right__search-header'>{searchForm}</div>
                <div className='sidebar-right__body'>
                    <SearchResultsHeader
                        isMentionSearch={this.props.isMentionSearch}
                        toggleSize={this.props.toggleSize}
                        shrink={this.props.shrink}
                        isFlaggedPosts={this.props.isFlaggedPosts}
                    />
                    <div
                        id='search-items-container'
                        className='search-items-container'
                    >

                    </div>
                </div>
            </div>
            );
        }
    }

    CugcInfoView.propTypes = {
        isMentionSearch: React.PropTypes.bool,
        useMilitaryTime: React.PropTypes.bool.isRequired,
        toggleSize: React.PropTypes.func,
        shrink: React.PropTypes.func,
        isFlaggedPosts: React.PropTypes.bool
    };
