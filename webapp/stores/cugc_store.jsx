import keyMirror from 'key-mirror/keyMirror.js';

import AppDispatcher from '../dispatcher/app_dispatcher.jsx';
import EventEmitter from 'events';

var CHANGE_EVENT = 'change';

class CugcStoreClass extends EventEmitter {
    constructor() {
        super();

        this.cugcInfo = null;
    }

    emitChange() {
        this.emit(CHANGE_EVENT);
    }

    addChangeListener(callback) {
        this.on(CHANGE_EVENT, callback);
    }

    removeChangeListener(callback) {
        this.removeListener(CHANGE_EVENT, callback);
    }

    getCugcInfo() {
        return this.cugcInfo;
    }

    storeCugcInfo(info) {
        this.cugcInfo = info;
    }
}

var CugcStore = new CugcStoreClass();
CugcStore.ActionTypes = keyMirror({
    RECEIVED_INFO: null
});

CugcStore.dispatchToken = AppDispatcher.register((payload) => {
    var action = payload.action;

    switch (action.type) {
        case CugcStore.ActionTypes.RECEIVED_INFO:
            console.log("hihi.store.received: ", payload);
            CugcStore.storeCugcInfo(action.info);
            CugcStore.emitChange();
            break;
        default:
    }
});

export default CugcStore;
