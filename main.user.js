// ==UserScript==
// @name         WaniKani NA-adjective highlighter
// @namespace    wk-na-adjective
// @version      0.0.4
// @description  Displays な after the subject in lessons and reviews.
// @author       Elias Benkhodja
// @include      /^https://(www|preview).wanikani.com/(lesson|review)/session/
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    "use strict";

    // From https://github.com/rfindley/wanikani-open-framework
    if (!window.wkof) {
        alert(
            "[WaniKani NA-adjective highlighter] script requires Wanikani Open Framework.\nYou will now be forwarded to installation instructions."
        );
        window.location.href = "https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549";
        return;
    }

    const SPAN_ID = "na-highlight";

    const log = (...msg) => console.log("[wk-na-adjective]", ...msg);

    // Determine if we are doing lessons or reviews, because the page is structured differently
    const isLessons = /^https:\/\/(www|preview).wanikani.com\/(lesson)\/session/.test(document.URL);

    // Check if the parts of speech include な
    const isNa = (subject) => {
        // If it's not a vocab item there will be no parts_of_speech object
        if (!subject.parts_of_speech) {
            return false;
        }

        const res = subject.parts_of_speech.map((a) => a.includes("な")).reduce((a, b) => a || b);
        log(`Is な-adjective: ${res} (${subject.parts_of_speech})`);
        return res;
    };

    // We have to use a custom tag because WK apparently replaces all span element contents...
    const newNaElement = () => $(`<span-na id="${SPAN_ID}" style="opacity: 0.5">な</span-na>`);

    // Add new element with な
    const addIfNa = (subject, insertAction) => {
        // I think the logic is easier to follow if we start from a clean state each time. This does cause some
        // potential trouble with infinite mutations, but we handle that in another way.
        clear();
        if (isNa(subject)) {
            insertAction(newNaElement());
        }
    };

    // Remove element added by this userscript
    const clear = () => $(`#${SPAN_ID}`).remove();

    const waitForElement = async (selector) => {
        while (true) {
            const el = $(selector);
            if (el.length > 0) {
                return el[0];
            }

            await new Promise((res) => setTimeout(res, 100));
        }
    };

    // WaniKani uses React for the lessons page, and something else for reviews so handle cases separately
    if (isLessons) {
        log("Lessons mode");

        // On the lesson page the html is structured like this:
        // <div id="character" lang="ja">...</div>
        const subjectEl = await waitForElement("#character");

        // We also need to observe mutations on the text node, because we would get an infinite loop of mutations if we
        // tried to observe #character and we added stuff to it
        const subjectElTextNode = Array.from($("#character")[0].childNodes).filter((n) => n.nodeType === 3)[0];

        const mutCb = async (mutationList, observer) => {
            // We don't need wkof here because WK loads the data in jStorage in lesson mode
            const subject = $.jStorage.get("l/quizActive")
                ? $.jStorage.get("l/currentQuizItem")
                : $.jStorage.get("l/currentLesson");
            addIfNa(subject, (naEl) => {
                naEl.appendTo(subjectEl);
            });
        };

        // Observe only characterData of the text node, since that is what will be changing
        const observer = new MutationObserver(mutCb);
        observer.observe(subjectElTextNode, { characterData: true });

        // Call manually for the first time in case we missed the initial state
        mutCb();
    } else {
        log("Reviews mode");

        // Immediately invoke async function to fetch subject data from wkof
        const items = (async () => {
            wkof.include("ItemData");
            await wkof.ready("ItemData");
            return await wkof.ItemData.get_index(await wkof.ItemData.get_items(), "subject_id");
        })();

        // On the review page the html is structured like this:
        // <div id="character" class="vocabulary">
        //     <span lang="ja">...</span>
        // </div>
        const subjectEl = await waitForElement("#character > span");

        const mutCb = async (mutationList, observer) => {
            // Get item id directly from jStorage
            const current_id = $.jStorage.get("currentItem").id;
            const subject = (await items)[current_id].data;
            addIfNa(subject, (naEl) => {
                // Insert after, not append to parent because we would end up with whitespace between the elements.
                naEl.insertAfter(subjectEl);
            });
        };

        // Observe for changes in the element containing the lesson item
        const observer = new MutationObserver(mutCb);
        observer.observe(subjectEl, { childList: true });

        // Call manually for the first time in case we missed the initial state
        mutCb();
    }
})();
