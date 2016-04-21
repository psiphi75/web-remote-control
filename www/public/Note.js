/*********************************************************************
 *                                                                   *
 *   Copyright 2016 Simon M. Werner                                  *
 *                                                                   *
 *   Licensed to the Apache Software Foundation (ASF) under one      *
 *   or more contributor license agreements.  See the NOTICE file    *
 *   distributed with this work for additional information           *
 *   regarding copyright ownership.  The ASF licenses this file      *
 *   to you under the Apache License, Version 2.0 (the               *
 *   "License"); you may not use this file except in compliance      *
 *   with the License.  You may obtain a copy of the License at      *
 *                                                                   *
 *      http://www.apache.org/licenses/LICENSE-2.0                   *
 *                                                                   *
 *   Unless required by applicable law or agreed to in writing,      *
 *   software distributed under the License is distributed on an     *
 *   "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY          *
 *   KIND, either express or implied.  See the License for the       *
 *   specific language governing permissions and limitations         *
 *   under the License.                                              *
 *                                                                   *
 *********************************************************************/

/* eslint-env jquery */
/* globals logError controller */

function Notes(noteId) { // eslint-disable-line no-unused-vars

    'use strict';

    // Find the element
    var $htmlElem = $('#' + noteId);
    if (!$htmlElem) {
        logError('Notes(): note not found: ' + noteId);
        return null;
    }

    // Restore from local storage
    var note = localStorage.getItem(noteId);
    if (typeof note === 'string') {
        noteSet(note);
        $htmlElem.val(note);
    }

    // Handle the note button click
    $('#btn-' + noteId).on('click', noteSend);


    /**
     * Send the note to the toy.
     */
    function noteSend() {

        // Get the latest note
        setFromTextBox();

        // Send the to the toy
        controller.sendNote(note);

    }


    /**
     * Set the note value and put it in localStorage
     * @param  {string} noteStr The new note value
     */
    function noteSet(noteStr) {
        note = noteStr;

        // Save the note to local storage.
        localStorage.setItem(noteId, note);
    }

    /**
     * Get the note value from the text box.
     */
    function setFromTextBox() {
        var tmpNote = $htmlElem.val();
        if (typeof tmpNote !== 'string' || tmpNote === '') {
            logError('Need to enter a value for the note');
            return null;
        }
        noteSet(tmpNote);
    }

    return {
        send: noteSend,
        set: noteSet,
        setFromTextBox: setFromTextBox
    };

}
