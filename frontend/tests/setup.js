import '@testing-library/jest-dom';
import { jest, expect } from '@jest/globals';

global.localStorage = {
    data: {},
    getItem(key) {
        return this.data[key] || null;
    },
    setItem(key, value) {
        this.data[key] = value;
    },
    removeItem(key) {
        delete this.data[key];
    },
    clear() {
        this.data = {};
    }
};

global.bootstrap = {
    Modal: function() {
        return {
            show: () => {},
            hide: () => {}
        };
    },
    Toast: function() {
        return { show: () => {} };
    },
    Dropdown: function() {}
};

global.bootstrap.Modal.getInstance = function() { return null; };

window.URL.createObjectURL = () => 'blob:test-url';
window.URL.revokeObjectURL = () => {};
window.open = () => {};

HTMLCanvasElement.prototype.getContext = () => ({});

afterEach(() => {
    localStorage.clear();
});
