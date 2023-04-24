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

function getUserContext(userData, ua) {
    var optiSdk = Alpine.store('optiSdk');
    if (optiSdk === null) {
        console.log("NULL optiSdk");
        return null;
    }

    if (optiSdk.client === null) {
        console.log("NULL optiSdk.client");
        return null;
    }

    return Alpine.store('optiSdk').client.createUserContext(userData.uid, ua);
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
    
    Alpine.store('sdkReady', {
        isLoaded: true
    });

    Alpine.store('optiSdk', {
        init() {
            this.fetchSdk(localStorage.getItem('sdk'))
        },
        client: null,
        clientVersion: 0,
        message: '',
        isError: false,
        key: localStorage.getItem('sdk'),
        fetchSdk(val) {
            if (val != sdkFromQs) {
                console.log(window.location.pathname + "?sdkkey=" + val);
                window.location = window.location.pathname + "?sdkkey=" + val;
            }
            
            var currentKey = localStorage.getItem('sdk');

            if (currentKey == '') {
                Alpine.store('sdkReady').isLoaded = false;
                return;
            }

            if (currentKey != val) {
                localStorage.setItem('sdk', val);
                window.optimizelyDatafile = val;
            }

            if (val != null && val !== '') {
            // initializeOpti(val);
            console.log('Optimizely SDK Key: ' + val);
            let scriptElement = document.createElement("script");
            scriptElement.id = "optiDf";
            scriptElement.setAttribute("src", "https://cdn.optimizely.com/datafiles/" + val + ".json/tag.js");
            document.body.appendChild(scriptElement);
            scriptElement.addEventListener("load", () => {
                console.log("SDK Loaded!");
                
                let optimizelyClient = window.optimizelySdk.createInstance({
                    //datafile: window.optimizelyDatafile,
                    sdkKey: val,
                    datafileOptions:  {
                    autoUpdate: true,
                    updateInterval: 1000
                    }
                });

                optimizelyClient.onReady().then(() => {
                // optimizelyClient is ready to use, with datafile downloaded from the Optimizely CDN
                Alpine.store('optiSdk').client = optimizelyClient;
                Alpine.store('optiSdk').isError = false;
                Alpine.store('optiSdk').message = 'You have entered a valid SDK Key!'
                Alpine.store('sdkReady').isLoaded = true;
                
                const onConfigUpdateListener = () => {
                    const config = optimizelyClient.getOptimizelyConfig();
                    console.log('New datafile retrieved.');
                    Alpine.store('optiSdk').clientVersion += 1;
                    console.log(Alpine.store('optiSdk').clientVersion);
                }

                optimizelyClient.notificationCenter.addNotificationListener(window.optimizelySdk.enums.NOTIFICATION_TYPES.OPTIMIZELY_CONFIG_UPDATE, onConfigUpdateListener);

                });
            });

            scriptElement.addEventListener("error", () => {
                console.log("ERROR loading SDK");
                Alpine.store('optiSdk').message = 'Invalid Key.  Enter another key and click "Update Key"'
                Alpine.store('optiSdk').isError = true;
                Alpine.store('sdkReady').isLoaded = false;
            });
            /* console.log(optimizely);
            client = optimizely.createInstance({
                sdkKey: val, // Provide the sdkKey of your desired environment here
            });
            client.onReady().then(() => {
                // optimizelyClientInstance is ready to use, with datafile downloaded from the
                // Optimizely CDN
            }); */
            }
        }
    });
        
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