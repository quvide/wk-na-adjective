// ==UserScript==
// @name         WaniKani NA-adjective highlighter
// @namespace    wk-na-adjective
// @version      0.0.2
// @description  Displays な after the subject in lessons and reviews.
// @author       Elias Benkhodja
// @include      /^https://(www|preview).wanikani.com/(lesson|review)/session/
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';

    // From https://github.com/rfindley/wanikani-open-framework
    if (!window.wkof) {
        alert('[WaniKani NA-adjective highlighter] script requires Wanikani Open Framework.\nYou will now be forwarded to installation instructions.');
        window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return;
    }

    const SPAN_ID = "na-highlight";

    const log = (...msg) => console.log("[wk-na-adjective]", ...msg);

    // Determine if we are doing lessons or reviews, because the page is structured differently
    const isLessons = /^https:\/\/(www|preview).wanikani.com\/(lesson)\/session/.test(document.URL);

    // Check if the parts of speech include な
    const isNa = (subject) => {
        const res = subject.parts_of_speech.map(a => a.includes("な")).reduce((a, b) => a || b);
        log(`Is な-adjective: ${res} (${subject.parts_of_speech})`);
        return res;
    }

    // Remove element we have added
    const clear = () => $(`#${SPAN_ID}`).remove();

    // WaniKani uses React for the lessons page, and something else for reviews
    if (isLessons) {
        log("Lessions mode");

        const subjectChangeCallback = (key, action) => {
            // Remove synchronously, or otherwise we might get race conditions
            clear();

            const subject = $.jStorage.get(key);

            if (subject && isNa(subject)) {
                // Async or otherwise react overwrites our addition, because it does changes after us
                setTimeout(() => {
                    $(`<span id="${SPAN_ID}" style="opacity: 0.5">な</span>`).appendTo($("#character"));
                }, 0);
            }
        }

        // Listen for changes in jStorage as the base event
        // TODO: maybe change this to use mutationobserver too?
        $.jStorage.listenKeyChange("l/currentQuizItem", subjectChangeCallback);
        $.jStorage.listenKeyChange("l/currentLesson", subjectChangeCallback);
    } else {
        log("Reviews mode");

        // This span contains the reviewed item
        const el = $("#character > span")[0];

        // Immediately invoke async function to fetch subject data
        const items = (async () => {
            wkof.include("ItemData");
            await wkof.ready("ItemData");
            return await wkof.ItemData.get_index(await wkof.ItemData.get_items(), "subject_id");
        })();

        const mutCb = async (mutationList, observer) => {
            const current_id = $.jStorage.get("currentItem").id;
            const subject = (await items)[current_id].data;

            clear();
            if (isNa(subject)) {
                // We have to use a custom tag because WK apparently replaces all span element contents...
                $(`<span-na id="${SPAN_ID}" style="opacity: 0.5">な</span-na>`).appendTo($("#character"));
            }
        };

        // Observe for changes in the element containing the reviewed item
        const observer = new MutationObserver(mutCb);
        observer.observe(el, { childList: true });
    }
})();