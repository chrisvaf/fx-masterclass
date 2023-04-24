function initializeUserAttribute(user, attribute, defaultValue, value) {
    if (user == null) {
        return;
    }

    if (value != null) {
        user[attribute] = value; 
    }
    else{
        user[attribute] = defaultValue;
    }
}

function checkLocalStorage(key, defaultVal) {
    var storageKey = localStorage.getItem(key);
    if (storageKey == null) {
        localStorage.setItem(key, defaultVal);
    }
}

document.addEventListener('alpine:init', () => {
    localStorage.setItem('userId', crypto.randomUUID());
    
    let params = new URLSearchParams(window.location.search);
    let sdkFromQs = params.get('sdkkey');
    if (sdkFromQs != null) {
        localStorage.setItem('sdk', sdkFromQs);
    }
    
    Alpine.store('user', {
        init() {
            initializeUserAttribute(this, 'mobileUser', false, localStorage.getItem('is_mobile_user') == 'true');
            initializeUserAttribute(this, 'regionState', '', localStorage.getItem('region_state'));
            initializeUserAttribute(this, 'email', '', localStorage.getItem('email'));
            initializeUserAttribute(this, 'isLoggedIn', 'false', localStorage.getItem('is_logged_in'));
        },
        uid: localStorage.getItem('userId'),
        updateLocalStorage(key, val) {
            localStorage.setItem(key, val);
        },
        updateUId(val) {
            localStorage.setItem('userId', val);
        }
    });
})