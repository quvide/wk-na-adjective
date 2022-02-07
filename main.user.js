// ==UserScript==
// @name         WaniKani NA-adjective highlighter
// @namespace    wk-na-adjective
// @version      0.0.1
// @description  Displays な after the subject in lessons.
// @author       Elias Benkhodja
// @include      /^https://(www|preview).wanikani.com/lesson/session/
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const LESSON_KEY = "l/currentLesson";
    const QUIZ_KEY = "l/currentQuizItem";

    const SPAN_ID = "na-highlight";

    // Check if the parts of speech include な
    const isNa = (subject) => subject.parts_of_speech.map(a => a.includes("な")).reduce((a, b) => a || b);

    const subjectChangeCallback = (key, action) => {
        console.log("subjectChangeCallback", key)

        $(`#${SPAN_ID}`).remove();

        const subject = $.jStorage.get(key);

        if (subject && isNa(subject)) {
            // Async or otherwise react overwrites our addition
            setTimeout(() => {
                $(`<span id="${SPAN_ID}" style="opacity: 0.5">な</span>`).appendTo($("#character"));
            }, 0);
        }
    }

    $.jStorage.listenKeyChange(QUIZ_KEY, subjectChangeCallback);
    $.jStorage.listenKeyChange(LESSON_KEY, subjectChangeCallback);
})();