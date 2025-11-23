// ==UserScript==

// @name         Eruda Console Loader

// @namespace    http://tampermonkey.net/

// @version      1.0

// @description  Loads Eruda developer console on any webpage

// @author       You

// @match        *://*/*

// @grant        none

// ==/UserScript==

(function () {

    var script = document.createElement('script');

    script.src = "https://cdn.jsdelivr.net/npm/eruda";

    document.body.append(script);

    script.onload = function () {

        eruda.init();

    };

})();