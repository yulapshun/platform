import AppDispatcher from 'dispatcher/app_dispatcher.jsx';

import Constants from 'utils/constants.jsx';
import CugcStore from 'stores/cugc_store.jsx';

export function getAllCugcInfo() {
    // delayed to simulate server response
    setTimeout(function() {
        var success = (data) => {
            console.log("hihi.info.success: ", data);
            console.log("hihi.info.success: ", CugcStore.ActionTypes.RECEIVED_INFO);
            AppDispatcher.handleServerAction({
                type: CugcStore.ActionTypes.RECEIVED_INFO,
                info: data,
            });
        };
        var fail = (err) => {
            AsyncClient.dispatchError(err, 'getFlaggedPosts');
        }
        success({});
    }, 1000);
}

export function hideCugcInfoView() {
    AppDispatcher.handleServerAction({
        type: CugcStore.ActionTypes.RECEIVED_INFO,
        info: null,
    });
}
