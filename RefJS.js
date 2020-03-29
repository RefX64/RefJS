/*  RefJS: Replaces most commonly used jQuery functions. Written using C# Style.
           Naming can throw some people off. A lot of them were based on C# types.
           This is NOT a jQuery replacement. Functions names and stuff does not match.
    Version: 0.8 Beta
    License: MIT License
    Website: https://github.com/Refdroid/RefJS
*/

/* ----------- Not Included/Easy Native solution already exist -----------
___ CustomEvent - Need a custom library (polyfill) for older browsers.
    var myEvent = new CustomEvent("myEvent"); -> obj/document.dispatchEvent(event); -> rj.AddEventListener('myEvent', '#obj'/'doc');

___ Class Manipulation (classList) - Need a polyfill for this for older browsers.
    (add, remove, has) -> obj.classList.add("myClass"), obj.classList.remove("myClass"), obj.classList.contains("myClass");
------------------- END TIPS ----------------- */

/**
 * RefJS Library
 * @example rj.find("#id") or rj.functionToCall(); 
 * @class rj
 */
export class RefJS {
    constructor() {
        this.GlobalOptions = {
            FetchCache: 'default' // no-store, reload, no-cache, force-cache 
        };
        this.ToParamString = this.generateStringParam;
        this.IsFunction = this.isFunction;
        this.GenerateUnobtrusiveFunction = this.generateUnobtrusiveFunction;
    }

    /**
     * <pre>
     *    Same as jQuery's $(selector). This one was tested faster on jsperf than jQuery 3.
     *    Warning:
     *    #1. Comma ',' without spaces will not work. For example rj.find('#id,#id2') wont work. However, rj.find('#id1, #id2') will.
     *    #2. Better to use rj.Id instead when you're finding something by id. It's much faster.
     * </pre>
     * @memberOf rj
     * @param {string} query E.g. '#Id', '.Class', 'p'
     * @returns {object} The selected element(s).
    */
    find(query) {
        const predictionID = query[0] === '#';
        const predictionClass = query[0] === '.';
        const predictionComplexQuery = query.includes(' ') || query.includes('=') || query.includes('[') || (predictionID && query.includes('.'));
        const predictionTag = !(predictionID || predictionClass || predictionComplexQuery);

        return predictionComplexQuery ? (document.querySelectorAll(query))
            : predictionID
                ? document.getElementById(query.substring(1))
                : predictionClass
                    ? document.getElementsByClassName(query.substring(1))
                    : predictionTag
                        ? document.getElementsByTagName(query)
                        : document.querySelectorAll(query);
    }

    /**
     * Returns an element by id. 
     * @memberOf rj
     * @param {string} id id of the element you are looking for. 
     */
    Id(id) { return document.getElementById(id); }

    //#region Events, Listeners

    /**
     * Execute functions when the document is ready. 
     * @memberOf rj
     * @param {function} func The function you would like to execute.
     */
    OnDocumentReady(func) {
        if (document.readyState === "complete") { func(); }
        else { document.addEventListener("DOMContentLoaded", func); }
    }

    /**
        Adds an event to the element or the document.
        @memberOf rj
        @example rj.AddEventListener('click', 'a[data-testclick]', function (e) { var message = e.target.getAttribute('data-message'); }
        @param {string} eventType The type of events. E.g. 'click', 'change', etc.
        @param {string} query E.g. '#Id', '.Class', 'p'
        @param {function} func It should be function(e) {} 
    */
    AddEventListener(eventType, query, func) {
        const obj = this.getObjectOrExecuteQuery(query);
        this.executeCollectionOrSingleTask(obj, item => {
            item.addEventListener(eventType, func);
        });
    }

    /**
    Removes an added function from the element or the document.
    @memberOf rj
    @param {string} eventType The type of events. E.g. 'click', 'change', etc.
    @param {string} query E.g. '#Id', '.Class', 'p'
    @param {function} func It should be function(e) {}
    */
    RemoveEventListener(query, eventType, func) {
        const obj = this.getObjectOrExecuteQuery(query);
        this.executeCollectionOrSingleTask(obj, item => {
            item.removeEventListener(eventType, func);
        });
    }

    //#endregion Events, Listeners

    //#region Ajax (Get, Post, Serialize, Validation)
    // If none of these work for you, feel free to implement your own by using fetch or xhr. 
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    // P.S. All of these async are promise functions, so you can execute your own .then, .catch, and .finally once it's done.

    /**
     * Loads an url into a target.
     * @memberOf rj
     * @example rj.AsyncLoad('targetId', '/LoadTarget', { id: '5' }).then(func(result)).catch(func(error)).finally(func);
     * @param {string} target TargetId or you can also pass in an element. 
     * @param {string} url The url to load
     * @param {object} param the parameters to pass in
     * @param {object} options see #RefJS_FetchOptions in finalRequest();
     */
    AsyncLoad(target, url, param, options) {
        return this.finalRequest(false, url, param, this.fillMissingAsyncOptions(options, false)).then(result => {
            const divObject = this.IsObject(target) ? target : this.getObjBySanitizedID(target);
            this.Empty(divObject);
            divObject.innerHTML = result;

            // Script fix. innerHTML=<script> does not produce executable script. 
            const divScripts = divObject.querySelectorAll("script");
            this.ForEach(divScripts, scriptNode => { this.NodeScriptReload(scriptNode); });
        }).catch(ex => { console.error(ex); });
    }

    /**
     * Loads a url
     * @memberOf rj
     * @param {string} url The url to load
     * @param {object} param the parameters to pass in
     * @param {object} options see #RefJS_FetchOptions in finalRequest();
     */
    AsyncGet(url, param, options) { return this.finalRequest(false, url, param, this.fillMissingAsyncOptions(options, false)); }

    /**
     * Loads a url and expects the result to be JSON type.
     * @memberOf rj
     * @param {string} url The url to load
     * @param {object} param the parameters to pass in
     * @param {object} options see #RefJS_FetchOptions in finalRequest();
     */
    AsyncGetJson(url, param, options) { return this.finalRequest(false, url, param, this.fillMissingAsyncOptions(options, true)); }

    /**
     * Posts data to a url
     * @memberOf rj
     * @param {string} url The url to load
     * @param {object} data the parameters to pass in. Data must be Object -> { id: 10, username: 'test' } or FormData -> var data = new FormData(formObj)
     * @param {object} options see #RefJS_FetchOptions in finalRequest();
     */
    AsyncPost(url, data, options) { return this.finalRequest(true, url, data, this.fillMissingAsyncOptions(options, false)); }

    /**
     * Submits a form along with all of its data. Needs URL from action tag.
     * @memberOf rj
     * @example <form action="/urlToPostForm" id="formToPost">...</form> -> rj.SubmitForm('formToPost').then(...);
     * @param {string} formId 
     * @param {object} options
     */
    AsyncSubmitForm(formId, options) {
        const formObj = this.getObjBySanitizedID(formId);
        const url = formObj.getAttribute("action");
        const data = new FormData(formObj);

        return this.finalRequest(true, url, data, this.fillMissingAsyncOptions(options, false));
    }

    /**
    The "sealed/final" function. Executes the AJAX/Fetch request.  All other Async calls depend on this.
    @param {bool} isPost Is the request POST? If not, it's a GET
    @param {string} url The url we are calling.
    @param {object} param All the parameters. E.g. { p1: 'test', p2: 10 }
    @param {object} options Fetch options to pass in. 
    #RefJS_FetchOptions {
        isJson: specifies if the return type is typeof json or not.
        fetchCache: take a look at official fetch cache document for proper options.
        fetchMode: take a look at official fetch mode document for proper options.
    }
    */
    finalRequest(isPost, url, data, options) {
        return new Promise((resolve, reject) => {
            url = isPost ? url : this.formatURLWithParam(url, data);
            if (isPost && !this.IsFormData(data)) { data = this.generateFormDataFromObj(data); }

            const request =
            {
                method: isPost ? "POST" : "GET",
                body: isPost ? data : null,
                cache: options.fetchCache,
                mode: options.fetchMode,
                credentials: 'same-origin'
            };

            fetch(url, request).then(this.checkFetchStatus)
                .then(response => options.isJson ? response.json() : response.text())
                .then(result => {
                    resolve(result);
                }).catch(ex => {
                    console.error(ex);
                    reject(ex);
                });
        });
    }

    checkFetchStatus(response) {
        if (response.status >= 200 && response.status < 300) {
            return response;
        }
        else {
            const error = new Error(response.statusText);
            error.response = response;
            throw error;
        }
    }
    
    fillMissingAsyncOptions(options, forceJson) {
        if (options == null || !this.IsObject(options)) { options = {}; }

        if (!this.IsValidValue(options.isJson)) { options.isJson = forceJson === true ? true : false; }
        if (!this.IsValidValue(options.fetchCache)) { options.fetchCache = this.GlobalOptions.FetchCache; }
        if (!this.IsValidValue(options.fetchMode)) { options.fetchMode = 'no-cors'; }

        return options;
    }

    /**
     * Turns javascript object/class into URL Parameters format.
     * @memberOf rj
     * @param {object} object parameters object
     * @returns {string} Example: { id: 10, username: "test" } -> id=10&username=test
     */
    generateStringParam(object) {
        let encodedString = '';
        for (const prop in object) {
            if (object.hasOwnProperty(prop)) {
                if (encodedString.length > 0) { encodedString += '&'; }
                encodedString += encodeURI(`${prop}=${object[prop]}`);
            }
        }
        return encodedString;
    }

    /**
     * Adds Parameters to an URL.
     * @memberOf rj
     * @param {string} url The url to combine the parameters with. Do you include "?" in the url.
     * @param {object} param The param must be object. E.g. { id: 10, name: Test }
     * @returns {string} The string format of: (url)?(param)
     */
    formatURLWithParam(url, param) {
        if (param != null) {
            if (typeof param == 'string') {
                return encodeURI(`${url}?${param}`);
            }
            return encodeURI(`${url}?${this.generateStringParam(param)}`);
        }
        return encodeURI(url);
    }

    /**
     * Gemerate FormData from param object
     * @memberOf rj
     * @param {object} obj Param object. E.g. { id: 10, username: "Test" }
     */
    generateFormDataFromObj(obj) {
        const formData = new FormData();
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) { formData.append(key, obj[key]); }
        }
        return formData;
    }

    //#endregion Ajax (Get, Post, Serialize, Validation)

    //#region Miscellaneous

    /**
     * Executes the function once if the object is a single item, or multiple times if the object is a collection.
     * @memberOf rj
     * @param {object} obj the object(s) (single item or collection)
     * @param {function} func the function to execute on the object. Must be function(obj). 
     */
    executeCollectionOrSingleTask(obj, func) {
        if (this.IsArray(obj) || this.IsHTMLCollection(obj) || obj.constructor === NodeList) { this.ForEach(obj, func); }
        else { func(obj); }
    }

    // If the passed in target is an object, returns the object. If not, treats the target as a query and finds the target. 
    getObjectOrExecuteQuery(target) { return this.IsObject(target) ? target : this.find(target); }

    // Assuming the query will be found by id. Clean it up incase users passes in '#id', instead of 'id'.
    getObjBySanitizedID(query) {
        query = query.replace("#", "");
        return this.Id(query);
    }

    /**
     * Checks if this is a proper function.
     * @memberOf rj
     * @param {function} functionToCheck the function to check if function.
     */
    isFunction(functionToCheck) {
        const getType = {};
        return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
    }

    /**
     * Gets the type of the object
     * @memberOf rj
     * @param {any} item The object to check
     * @returns {string} The type of object in string format
     */
    GetType(item) {
        if (item == null) { return null; }
        else if (this.IsObject(item)) { return Object.prototype.toString.call(item); } // returns "[object complexObject]"s
        else { return typeof item; }
    }

    IsObject(item) { return typeof (item) == 'object'; }
    IsFormData(item) { return (typeof FormData !== 'undefined') && (item instanceof FormData); }

    IsTypeOf(obj, typeName) {
        const objectType = this.GetType(obj);
        if (objectType == null) { return false; }

        return this.StringContains(objectType, typeName);
    }

    IsNullOrUndefined(obj) { return obj == null || obj == "undefined"; }

    /**
     * Check is the value is numbers only.
     * @memberOf rj
     * @param {string} val The value to check
     */
    IsNumeric(val) {
        const num = Number(val);
        const type = typeof val;
        return val != null && type !== 'boolean' && (type !== 'string' || val.length) && !isNaN(num) && isFinite(num) || false;
    }

    /**
     * Basically a foreach function.
     * @memberOf rj
     * @example rj.ForEach(array, function(item) {...}) OR rj.ForEach(rj.find('p'), function(obj) { obj.style.backgroundColor = '#333'; });
     * @param {object} arr The collection of items 
     * @param {function} func The function to run on each collection items. 
     */
    ForEach(arr, func) {
        // TIP: if using native .forEach, Need IE9+. no stict mode in IE9. Does not support parseInt in few browsers, like older android. Visit Caniuse.com for more info.
        if (arr === null || typeof arr === 'undefined') { return; }
        if (typeof arr !== 'object' && !this.IsArray(arr)) { arr = [arr]; } // If not an array, force it into an array.

        for (let i = 0, len = arr.length; i < len; i++) { func(arr[i]); }
    }

    /**
     * Completely empties out the inner html of chosen selectors. Tries to empty eventListeners as well.
     * @memberOf rj
     * @param {any} selector Object or a string to empty
     */
    Empty(selector) {
        const obj = this.IsObject(selector) ? selector : this.find(selector);
        this.executeCollectionOrSingleTask(obj, item => {
            while (item.firstChild) { item.removeChild(item.firstChild); }
        });
    }

    /**
     * Scrolls to a specific location with animation.
     * @memberOf rj
     * @example For scrolling to specific location(non-animation), you could also use: window.scrollTo(x-coord, y-coord);
     * @param {number} toElement
     * @param {number} duration
     */
    ScrollTo(toElement, duration) {
        const scrollingElement = document.scrollingElement || document.documentElement;
        const currentDoc = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

        if (!this.IsValidValue(duration)) { duration = 1250; }
        const toPosition = (typeof (toElement) === "number") ? toElement : toElement.getBoundingClientRect().top;

        const start = currentDoc;
        const change = toPosition - start;
        const increment = 20;

        const animateScroll = elapsedTime => {
            elapsedTime += increment;
            const position = this.easeInOut(elapsedTime, start, change, duration);
            scrollingElement.scrollTop = position;
            if (elapsedTime < duration) {
                setTimeout(() => {
                    animateScroll(elapsedTime);
                }, increment);
            }
        };

        animateScroll(0);
    }

    /**
     * Gets the current browser scroll location
     * @memberOf rj
     */
    GetScrollTop() {
        if (typeof pageYOffset != 'undefined') { return pageYOffset; }
        else {
            const B = document.body; //IE 'quirks'
            let D = document.documentElement; //IE with doctype
            D = (D.clientHeight) ? D : B;
            return D.scrollTop;
        }
    }

    /** 
     * Appends html value to a selected location.
     * @memberOf rj
     * @example rj.AppendHTML('.class', '<p>Test</p>', 'afterbegin') or leave position empty for default afterend
     * @param {string} query The place to append the html value.
     * @param {string} htmlValue The html value to append
     * @param {string} position Position to append the htmlValue. (beforebegin)<p>(afterbegin)foo(beforeend)</p>(afterend)
     */
    AppendHTML(query, htmlValue, position) {
        if (!this.IsValidValue(position)) { position = 'beforeend'; }
        const obj = this.getObjectOrExecuteQuery(query);
        this.executeCollectionOrSingleTask(obj, item => {
            item.insertAdjacentHTML(position, htmlValue);
        });
    }

    /**
     * Moves HTML from one location to another.
     * @memberOf rj
     * @param {string} sourceId The source id of the element to move
     * @param {string} movingToSelector The location to move it to. You can specify an #id, or a .class
     */
    MoveHTMLTo(sourceId, movingToSelector) {
        const obj1 = this.getObjBySanitizedID(sourceId);
        const obj2 = this.find(movingToSelector);
        if (this.IsHTMLCollection(obj1)) {
            console.error("Error: Source must be a single selectable object.");
        }

        const result = obj1.innerHTML;
        this.Empty(obj1);
        this.executeCollectionOrSingleTask(obj2, item => {
            this.Empty(item);
            item.innerHTML = result;
        });
    }

    /**
     * Gets all the child nodes of an element
     * @memberOf rj
     * @param {string} el The element (id, class)
     * @param {string} selector The children to search for. E.g.: #id, .class, tag. E.g. #myTable, .myTable, or table
     * @returns An array of child nodes
     */
    FindChildren(el, selector) {
        el = this.getObjectOrExecuteQuery(el);
        return el.querySelectorAll(selector);
    }

    /**
     * Find the parent of the selected node
     * @memberOf rj
     * @param {string} el The element (id, class)
     * @param {string} selector Example: #id, .class, tag. E.g. #myTable, .myTable, or table
     */
    FindParent(el, selector) {
        const findById = selector[0] === "#";
        const findByClass = selector[0] === ".";
        const findByTag = !findById && !findByClass;

        while (el && el.parentNode) {
            el = el.parentNode;

            if (findById && el.id && el.id == selector.substring(1)) { return el; }
            else if (findByClass && el.classList && el.classList.contains(selector.substring(1))) { return el; }
            else if (findByTag && el.tagName && el.tagName.toLowerCase() == selector) { return el; }
        }
    }

    // (Tip) Closest: built-in JS. element.closest(selector); Selectors example: "body > div", ":not(div)"
    // (Tip) Siblings: node.nextElementSibling, node.previousElementSibling;

    /**
     * Show/Hide the target element(s)
     * @memberOf rj
     * @param {string} target selector (#id, .class, .etc)
     * @param {string} isShow True: Show, False: Hide
     * @param {bool} isAnimate Animate the show/hide or not
     */
    Show(target, isShow, isAnimate) {
        const obj = this.getObjectOrExecuteQuery(target);
        this.executeCollectionOrSingleTask(obj, i => {
            if (isShow) {
                i.classList.remove('hidden');
                if (isAnimate === true) { this.AnimateFadeIn(obj); }
                else { i.style.display = 'block'; }
            }
            else {
                if (isAnimate === true) { this.AnimateFadeOut(obj); }
                else { i.style.display = 'none'; }
            }
        });
    }

    /**
     * Toggles the show/hide. If it's hidden, shows. If it's shown, hides.
     * @memberOf rj
     * @param {string} target selector (#id, .class, .etc)
     * @param {string} isAnimate Animate the show/hide or not
     */
    ToggleShowHide(target, isAnimate) {
        const obj = this.getObjectOrExecuteQuery(target);
        const isHidden = obj.style.display === 'none' || obj.classList.contains('hidden');
        this.Show(obj, isHidden, isAnimate);
    }

    /**
     * Prevents firing an event too many times depending on the wait
     * Gotten from: http://underscorejs.org/docs/underscore.html
     * @memberOf rj
     * @param {function} func the function to run
     * @param {number} wait the delay time before allowing it to run again
     * @param {object} options Please check the link above for more info
     */
    Throttle(func, wait, options) {
        let context;
        let args;
        let result;
        let timeout = null;
        let previous = 0;
        if (!options) options = {};
        const later = () => {
            previous = options.leading === false ? 0 : new Date().getTime();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        return function () {
            const now = new Date().getTime();
            if (!previous && options.leading === false) previous = now;
            const remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = setTimeout(later, remaining);
            }
            return result;
        };
    }

    // String Functions
    /**
     * Check if string 1 equals to string 2 (case-insensitive).
     * @memberOf rj
     * @param {string} str1 first string
     * @param {string} str2 second stirng
     */
    StringEquals(str1, str2) { return String(str1).toLowerCase() === String(str2).toLowerCase(); }

    /**
     * Check if the term string contains in the full string
     * @memberOf rj
     * @param {string} full the full string
     * @param {string} term the term to search for
     */
    StringContains(full, term) { return full.toLowerCase().includes(term.toLowerCase()); }

    /**
     * Similar to String.Format in C#. Usage: rj.StringFormat("CarMake: {0} {1}", "Nissan", "Sentra") would return "CarMake: Nissan Sentra"
     * @memberOf rj
     * @param {string} str The base string to pass in. Make sure to add arguments as well. Please look at example usage.
     * @returns {string} The formatted string
     */
    StringFormat(str) {
        for (let i = 1; i < arguments.length; i++) {
            const reg = new RegExp(`\\{${i - 1}\\}`, "gm");
            str = str.replace(reg, arguments[i]);
        }
        return str;
    }

    // This is for Case Insensitive purpose. Better to use built-in str.replace('old', 'new');
    /**
     * Replaces all strings from string1 to string2.
     * @memberOf rj
     * @example rj.ReplaceAll("TestFooBar", "Test") would return "FooBar".
     * @param {string} str1 the full string
     * @param {string} str2 the string to replace with
     * @param {any} ignore
     */
    ReplaceAll(str1, str2, ignore) {
        return this.replace(new RegExp(str1.replace(/([\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g, c => `\\${c}`), `g${ignore ? "i" : ""}`), str2);
    }

    /**
     * Returns number in comma format. For example, 1000000 turns to 1,000,000
     * @memberOf rj
     * @param {any} num
     */
    CommaFormat(num) { return Number(num).toLocaleString('en'); }

    // Arrays
    IsHTMLCollection(obj) { return obj.constructor === HTMLCollection; }

    IsArray(obj) { return obj.constructor === Array; }

    ArrayContains(a, obj) {
        let i = a.length;
        while (i--) {
            if (a[i] === obj) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check is the passed value is valid (aka not null or empty string)
     * @memberOf rj
     * @param {string} str The value to check
     */
    IsValidValue(str) {
        return ((str != null && str.length > 0 && str !== 'undefined') || (str === true || str === false));
    }

    /**
     * Check if the passed in object or object id ("#id") is valid (aka not null)
     * @memberOf rj
     * @param {any} target the selector ("#id") or the passed in object
     */
    IsValidElement(target) {
        const obj = this.IsObject(target) ? target : this.getObjBySanitizedID(target);
        return (id !== null && id !== undefined && id.length > 0);
    }

    /**
     * Similar to Url.Action in ASP .NET MVC/.Core.
     * @memberOf rj
     * @example rj.UrlAction("Index", "Main", { id: 5 }) returns "/Main/Index?id=5"
     * @param {string} action The name of the Action you are calling
     * @param {string} controller The name of the Controller you are calling
     * @param {object} params An object containing parameters
     */
    UrlAction(action, controller, params) {
        let str = "";
        if (params) {
            for (const key in params) {
                if (str !== "") { str += "&"; } // Add & at the beginning of a parameter.
                str += `${key}=${encodeURIComponent(params[key])}`;
            }
            return `/${controller}/${action}?${str}`;
        }

        if (controller == null || controller == "undefined") { return `/${action}`; }
        return `/${controller}/${action}`;
    }

    // *** Input item manipulation. You can call them using <input onchange="rj.InputFilterDecimal(this)">

    /**
     * Only allow numbers on inputs.
     * @memberOf rj
     * @example <input onchange="rj.InputFilterDecimal(this)">
     * @param {any} obj The input object. Use "this".
     */
    InputFilterDecimal(obj) { obj.value = obj.value.replace(/[^0-9.]/g, ""); }

    RadioButtonValueByName(name) { return document.querySelector(this.StringFormat('input[name="{0}"]:checked', name)).value; }

    // *** Select List function: Add/Populate, Get/View, Delete, Contains

    /**
     * Add an item to the select list
     * @memberOf rj
     * @param {string} query the selector of the select list
     * @param {string} text the text of the item to add
     * @param {string} value the value of the item to add
     */
    AddSelectListItem(query, text, value) { this.AppendHTML(query, this.StringFormat('<option value="{1}">{0}</option>', text, value), 'beforeend'); }

    GetSelectListValue(query) { const selectList = this.getObjectOrExecuteQuery(query); return selectList[selectList.selectedIndex].value; }
    GetSelectListText(query) { const selectList = this.getObjectOrExecuteQuery(query); return selectList[selectList.selectedIndex].innerHTML; }

    /**
     * Delete an item from th select list based on the value.
     * @memberOf rj
     * @param {string} query the selector of the select list
     * @param {string} value the value to find and delete
     */
    DeleteSelctListItem(query, value) {
        const selectList = this.getObjectOrExecuteQuery(query, value);
        for (let i = 0; i < selectList.length; i++) {
            if (selectList.options[i].value === value) { selectList.remove(i); }
        }
    }

    /**
     * Clears a select list
     * @memberOf rj
     * @param {string} query the selector of the select list
     */
    ClearSelectList(query) {
        const selectList = this.getObjectOrExecuteQuery(query);
        while (selectList.options.length > 0) { selectList.remove(0); }
    }

    /**
     * Populate a select list item with results.
     * @memberOf rj
     * @param {string} query selector for the select list
     * @param {object} result Should be a json object that was Text and Value property. 
     * @param {bool} clearList specify wether to CLEAR the list first or APPEND to the list.
     */
    PopulateSelectList(query, result, clearList) {
        const list = this.getObjectOrExecuteQuery(query);
        if (clearList === true) { this.ClearSelectList(list); }

        this.ForEach(result, item => { this.AddSelectListItem(list, item.Text, item.Value); });
    }

    /**
     * Check if the select list contains a value
     * @memberOf rj
     * @param {string} query selector for the select list
     * @param {string} value pass in the value or text to search for
     * @param {string} text pass in the value or text to search for
     */
    SelectListContains(query, value, text) {
        const list = this.getObjectOrExecuteQuery(query);
        let found = false;
        this.ForEach(list.options, item => {
            if (!found) {
                if (item.value === value.toString()) { found = true; }
                if (item.innerHTML === text) { found = true; }
            }
        });
        return found;
    }

    /**
     * Replace node <script> with the executable version. javascript.innerHTML = "<script>...</>" does not execute the scripts.
     * @param {any} node the script node
     */
    NodeScriptReload(node) {
        function isNodeScript(node) { return node.tagName === 'SCRIPT'; }
        function nodeScriptClone(node) {
            const script = document.createElement("script");
            script.text = node.innerHTML;
            for (let i = node.attributes.length - 1; i >= 0; i--) {
                script.setAttribute(node.attributes[i].name, node.attributes[i].value);
            }
            return script;
        }

        if (isNodeScript(node) === true) {
            node.parentNode.replaceChild(nodeScriptClone(node), node);
        }
        else {
            let i = 0;
            const children = node.childNodes;
            while (i < children.length) {
                this.NodeScriptReload(children[i++]);
            }
        }

        return node;
    }

    /**
     * Loads a Javascript file, and then executes the callback function when loading is completed.
     * @memberOf rj
     * @param {string} src the path to javascript file
     * @param {function} callback the callback function to run after js file loaded.
     */
    LoadJS(src, callback) {
        const js = document.createElement('script');
        js.src = src;
        js.onload = () => {
            if (this.isFunction(callback)) { callback(); };
        };
        document.head.appendChild(js);
    }

    /**
     * Returns if the current browser is IE or EDGE.
     * @memberOf rj
     */
    IsIEorEdge() {
        return (navigator.userAgent.indexOf("MSIE ") !== -1 || navigator.userAgent.indexOf("Trident/") !== -1 || navigator.userAgent.indexOf("Edge/") !== -1);
    }

    //#endregion Miscellaneous

    //#region Animation
    /**
     * Fade in animation
     * @memberOf rj
     * @param {any} obj The object to animate. 
     * @param {number} duration The duration of the animation.
     */
    AnimateFadeOut(obj, duration) {
        obj = this.getObjectOrExecuteQuery(obj);
        this.executeCollectionOrSingleTask(obj, () => {
            let op = 1;  // initial opacity
            if (duration == null) { duration = 20; }

            const timer = setInterval(() => {
                if (op <= 0.1) {
                    clearInterval(timer);
                    obj.style.display = 'none';
                }
                obj.style.opacity = op;
                obj.style.filter = `alpha(opacity=${op * 100})`;
                op -= op * 0.1;
            }, duration);
        });
    }

    /**
     * Fade out animation
     * @memberOf rj
     * @param {any} obj The object to animate. 
     * @param {number} duration The duration of the animation.
     */
    AnimateFadeIn(obj, duration) {
        obj = this.getObjectOrExecuteQuery(obj);
        this.executeCollectionOrSingleTask(obj, () => {
            let op = 0.1;
            obj.style.display = 'block';
            if (duration == null) { duration = 20; }

            const timer = setInterval(() => {
                if (op >= 1) { clearInterval(timer); }

                obj.style.opacity = op;
                obj.style.filter = `alpha(opacity=${op * 100})`;
                op += op * 0.1;
            }, duration);
        });
    }

    easeInOut(currentTime, start, change, duration) {
        currentTime /= duration / 2;
        if (currentTime < 1) {
            return change / 2 * currentTime * currentTime + start;
        }
        currentTime -= 1;
        return -change / 2 * (currentTime * (currentTime - 2) - 1) + start;
    }

    //#endregion Animation

    // #region Unobtrusive/Validation Functions

    /**
     * Validates a form and makes sure that every input are in correct/expected format.
     * @memberOf rj
     * @example Warning: The form MUST have: "@Html.ValidationSummary()" or '<div data-valmsg-summary="true"></div>'.
     * @example if (rj.ValidateForm('formToValidateId')) { rj.AsyncSubmitForm('formToValidateId'); }
     * @param {string} formId The form to validate. Pass in the form id. 
     * @param {bool} markInvalidInputs Specify whether to mark EACH invalid input (if not, will only display the summary.)
     * @returns {bool} true or false. Wether the form inputs are valid or not.  
     */
    ValidateForm(formId, markInvalidInputs) {
        formId = formId.replace('#', '');
        if (markInvalidInputs == null || markInvalidInputs === 'undefined') { markInvalidInputs = true; }

        const elements = document.querySelectorAll(`#${formId} [data-val="true"]`);
        if (elements.length < 1) { return true; } // No Elements to validate

        const errors = [];
        const container = document.querySelector(`#${formId} [data-valmsg-summary=true]`);

        function addError(errorMessage, elem, markInvalidInputs) {
            errors.push(errorMessage);
            if (markInvalidInputs) {
                elem.classList.add('input-has-error');
            }
        }

        this.ForEach(elements, elem => {
            // Remove previous error-mark (if any)
            if (elem.classList.contains('input-has-error')) {
                elem.classList.remove('input-has-error');
            }

            const isRequired = elem.hasAttribute('data-val-required');
            const hasValue = elem.value.length > 0;

            // [Required]
            if (isRequired) {
                if ((elem.value == null || elem.value.length < 1) || elem.value.toLowerCase() === 'select') {
                    addError(elem.getAttribute('data-val-required'), elem, markInvalidInputs);
                }
            }

            // [EmailAddress]
            if (elem.hasAttribute('data-val-email')) {
                if ((isRequired || hasValue) && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,6})+$/.test(elem.value)) {
                    addError(elem.getAttribute('data-val-email'), elem, markInvalidInputs);
                }
            }

            // [StringLength]
            if (elem.hasAttribute('data-val-length-min')) {
                const minStrLength = parseInt(elem.getAttribute('data-val-length-min'));
                if ((isRequired || hasValue) && elem.value.length < minStrLength) {
                    addError(elem.getAttribute('data-val-length'), elem, markInvalidInputs);
                }
            }
            if (elem.hasAttribute('data-val-length-max')) {
                const maxStrLength = parseInt(elem.getAttribute('data-val-length-max'));
                if ((isRequired || hasValue) && elem.value.length > maxStrLength) {
                    addError(elem.getAttribute('data-val-length'), elem, markInvalidInputs);
                }
            }

            // [MinLength]
            if (elem.hasAttribute('data-val-minlength-min')) {
                const minLength = parseInt(elem.getAttribute('data-val-minlength-min'));
                if ((isRequired || hasValue) && elem.value.length < minLength) {
                    addError(elem.getAttribute('data-val-minlength'), elem, markInvalidInputs);
                }
            }

            // [MaxLength]
            if (elem.hasAttribute('data-val-maxlength-max')) {
                const maxLength = parseInt(elem.getAttribute('data-val-maxlength-max'));
                if ((isRequired || hasValue) && elem.value.length > maxLength) {
                    addError(elem.getAttribute('data-val-maxlength'), elem, markInvalidInputs);
                }
            }

            // [DataType(Date)]
            if (elem.getAttribute('type') === 'date') {
                if ((isRequired || hasValue) && /Invalid|NaN/.test(new Date(elem.value).toString())) {
                    addError(`${elem.getAttribute('name')} must be a proper date value.`, elem, markInvalidInputs);
                }
            }

            // [DataType(Url)]
            if (elem.getAttribute('type') === 'url') {
                if ((isRequired || hasValue) &&
                    /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(elem.value)) {
                    addError(`${elem.getAttribute('name')} must be a proper url value.`, elem, markInvalidInputs);
                }
            }
        });

        if (container == null) {
            // No where to display error message, just return validation result.
            console.info('Not displaying validation errors. [data-valmsg-summary] not found. Use @Html.ValidationSummary() on MVC.');
            return errors.length < 1;
        }

        const list = container.firstChild;

        // Reset everything.
        container.className = '';
        this.Empty(list);

        if (errors.length > 0) {
            container.classList.add('validation-summary-errors');
            this.ForEach(errors, err => {
                list.innerHTML += `<li>${err}</li>`;
            });
            return false;
        }
        else {
            container.classList.add('validation-summary-valid');
            return true;
        }
    }

    // Example on how to use below. Just create one instance and add your global listeners there. (Create global click listener)
    // document.addEventListener('click', function(e) { if (e.target.hasAttribute('data-loadpartial')) { rj.UnobtrusiveLoadPartial(e.target); } });

    /**
     * <pre>
     * Loads a url to a specific target if the node has "data-loadpartial" attribute. 
     * Fore example: "<a href='javascript:void(0)' data-loadpartial data-url='www.urlToLoad.com' data-targetid='urlResult' data-success='methodToCallAfterSuccess'>Load URL Result</a>
     * Targets "data-loadpartial". Loads url content into desired target Id.
     * data-url: the url to load the partial,
     * data-targetid: the target id to load in results to.
     * data-params: the parameters (if any). Must be in string format. E.g. "id=10&lastName=Tester"
     * data-success: the name of the success function to call. E.g. "editFormLoadSucceeded"
     * data-error: the name of the error function to call. E.g. "editFormLoadFailed"
     * (todo):  data-loadingdiv: the div to show/hide when loading.
     * Can also call functions from other libraries. For example "app.methodToCall". Use a period to seperate. (library.method)
     * </pre>
     * @memberOf rj
     * @param {any} target the target to listen to. Activate it using: document.addEventListener('click', function(e) { if (e.target.hasAttribute('data-loadpartial')) { rj.UnobtrusiveLoadPartial(e.target); } });
     */
    UnobtrusiveLoadPartial(target) {
        let url = target.getAttribute('data-url');
        const targetId = target.getAttribute('data-targetid');
        if (target.hasAttribute('data-params')) { url = `${url}?${target.getAttribute('data-params')}`; }

        return this.AsyncLoad(targetId, url, null, null).then(() => {
            const successFuncToCall = this.generateUnobtrusiveFunction(target.getAttribute('data-success'));
            if (this.isFunction(successFuncToCall)) { successFuncToCall(); }
        }).catch(ex => {
            console.error(ex);
            const errorFuncToCall = this.generateUnobtrusiveFunction(target.getAttribute('data-error'));
            if (this.isFunction(errorFuncToCall)) { errorFuncToCall(); }
        });
    }

    generateUnobtrusiveFunction(funcString) {
        if (!this.IsValidValue(funcString)) { return null; }

        if (this.StringContains(funcString, ".")) {
            const funcStringArray = funcString.split(".");
            const library = window[funcStringArray[0]];
            return library[funcStringArray[1]];
        }
        else {
            return window[funcString];
        }
    }

    // #endregion Unobtrusive/Validation Functions
}