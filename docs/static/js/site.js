var zaius = window['zaius']||(window['zaius']=[]);zaius.methods=["initialize","onload","customer","entity","event","subscribe","unsubscribe","consent","identify","anonymize","dispatch"];zaius.factory=function(e){return function(){var t=Array.prototype.slice.call(arguments);t.unshift(e);zaius.push(t);return zaius}};(function(){for(var i=0;i<zaius.methods.length;i++){var method=zaius.methods[i];zaius[method]=zaius.factory(method)}var e=document.createElement("script");e.type="text/javascript";e.async=true;e.src=("https:"===document.location.protocol?"https://":"http://")+"d1igp3oop3iho5.cloudfront.net/v2/W4WzcEs-ABgXorzY7h1LCQ/zaius-min.js";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();

zaius.event('pageview');

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

function trackEvent(flagkey, eventKey) {
    if (flagkey == '') {
        return;
    }

    var optiSdk = Alpine.store('optiSdk');

    if (optiSdk != null) {
        if (optiSdk.client != null) {
            var userStore = Alpine.store('user');

            if (userStore != null) {
                var userId = userStore.uid;
                var uc = optiSdk.client.createUserContext(userId, null);
                if (uc != null) {
                    uc.trackEvent(eventKey);
                }
            }
        }
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

                const onDecision = ({ type, userId, attributes, decisionInfo }) => {
                    // Add a DECISION Notification Listener for type FLAG
                    if (type === 'flag') {
                      // Access information about feature, for example, key and enabled status
                      console.log(type);
                      // Send data to analytics provider here
                      
                      if (decisionInfo['enabled']) {
                        zaius.event('Flag', {
                            action: 'Enabled', 
                            flag_key: decisionInfo['flagKey'],
                            experiment_variation_name: decisionInfo['variationKey'],
                            campaign: 'Variation: ' + decisionInfo['variationKey']
                        });
                        }
                    }
                }
                  
                optimizelyClient.notificationCenter.addNotificationListener(window.optimizelySdk.enums.NOTIFICATION_TYPES.DECISION, onDecision);

                const onLogEvent = (logEvent) => {
                    // process the event here (send to analytics provider, audit/inspect data)
                    var tags = logEvent.params.visitors[0].snapshots[0].events[0].tags;

                    if (tags != null) {
                         if (tags.event_type === 'product') {
                            var productId = tags.product_id;
                            zaius.event(tags.event_type, {
                                action: logEvent.params.visitors[0].snapshots[0].events[0].key,
                                product_id: productId 
                            });
                        }
                        else {
                            zaius.event(tags.event_type, {
                                action: logEvent.params.visitors[0].snapshots[0].events[0].key
                            });
                        }
                    }
                }
                  
                optimizelyClient.notificationCenter.addNotificationListener(window.optimizelySdk.enums.NOTIFICATION_TYPES.LOG_EVENT, onLogEvent);
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