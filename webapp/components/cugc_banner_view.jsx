import React from 'react';
import * as ChannelActions from 'actions/channel_actions.jsx';
import {formatText} from 'utils/text_formatting.jsx';

export default class CugcBannerView extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            showing: true,
            messages: []
        };
    }

    componentWillMount() {
        ChannelActions.executeCommand(
            '/banner',
            {channel_id: this.props.channelId},
            (resp) => {
                let messages = JSON.parse(resp.text);
                this.setState({
                    messages: messages
                });
            },
            () => {
                console.log('/banner command not exist');
            }
        );
    }

    toggleShowHide() {
        this.setState({
            showing: !this.state.showing
        });
    }

    renderMessage(msg, i) {
        let time = new Date(parseInt(msg.updated_at) * 1000);
        let year = '' + time.getFullYear();
        let month = '' + (time.getMonth() + 1);
        month = '00'.slice(month.length) + month;
        let date = '' + time.getDate();
        date = '00'.slice(date.length) + date;
        let hour = '' + time.getHours();
        hour = '00'.slice(hour.length) + hour;
        let minute = '' + time.getMinutes();
        minute = '00'.slice(minute.length) + minute;
        let timeString = year + '-' + month + '-' + date + ' ' + hour + ':' + minute;
        return (
            <div key={'banner-msg-'+i} className="cugc-banner-msg">
                <div className="col-md-8"
                     dangerouslySetInnerHTML={{__html: formatText(msg.message)}}></div>
                <div className="col-md-2">{msg.created_by}</div>
                <div className="col-md-2">{timeString}</div>
            </div>
        );
    }

    render() {
        return (
            <div className="cugc-banner-container">
                {this.state.showing &&
                <div className="cugc-banner-msg-container">
                    {this.state.messages.map((msg, i) => {
                         return this.renderMessage(msg, i);
                     })}
                </div>}
                <div className=
                     {
                         "col-md-12 cugc-banner-caret " + (this.state.showing ? "cugc-banner-caret-show" : "cugc-banner-caret-hide")
                     }
                     onClick={this.toggleShowHide.bind(this)}>
                    {this.state.showing ? '▲' : '▼'}
                </div>
            </div>
        );
    }
}
