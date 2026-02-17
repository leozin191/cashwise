import { DeviceEventEmitter } from 'react-native';

const EVENT_NAME = 'dataChanged';

export const emitDataChanged = (payload) => {
    DeviceEventEmitter.emit(EVENT_NAME, payload);
};

export const addDataChangedListener = (handler) => (
    DeviceEventEmitter.addListener(EVENT_NAME, handler)
);
