{
	"translatorID": "a14ac3eb-64a0-4179-970c-92ecc2fec992",
	"label": "Scopus",
	"creator": "Michael Berkowitz, Rintze Zelle and Avram Lyon",
	"target": "^https?://www\\.scopus\\.com[^/]*",
	"minVersion": "2.1",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-02-19 17:52:55"
}

/*
   Scopus Translator
   Copyright (C) 2008-2021 Center for History and New Media and Sebastian Karcher

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU Affero General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU Affero General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function detectWeb(doc, url) {
	if (url.includes("/results/") && getSearchResults(doc, true)) {
		return "multiple";
	}
	else if (url.includes("/record/")) {
		return "journalArticle";
	}
	return false;
}

function getEID(url) {
	return url.match(/eid=([^&]+)/)[1];
}


function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;
	// Last version added 2025-02-19 -- not clear we need the others still
	var rows = doc.querySelectorAll('tr[id *= resultDataRow] td a[title = "Show document details"], tr[class *= "resultsRow"] h4 a[title = "Show document details"], div.table-title h4 a, div.document-results-list-layout table h3 a');
	for (var i = 0; i < rows.length; i++) {
		var href = rows[i].href;
		var title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) == "multiple") {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (items) {
			for (let url of Object.keys(items)) {
				await scrape(await requestDocument(url), url);
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}
	}
	else {
		await scrape(doc, url);
	}
}


async function scrape(doc, url) {
	// ISBN, language, and ISSN are not in the export data - get them from the page
	var ISSN = ZU.xpathText(doc, '//div[contains(@class, "meta-text")]//dl[dt[contains(text(), "ISSN")]]/dd');
	var ISBN = ZU.xpathText(doc, '//div[contains(@class, "meta-text")]//dl[dt[contains(text(), "ISBN")]]/dd');
	var language = ZU.xpathText(doc, '//div[contains(@class, "meta-text")]//dl[dt[contains(text(), "Original language")]]/dd');
	var prefix = url.match(/^https?:\/\//)[0];
	var baseUrl = prefix + doc.location.host
		+ '/onclick/export.uri?oneClickExport=%7b%22Format%22%3a%22RIS%22%2c%22View%22%3a%22CiteAbsKeyws%22%7d&origin=recordpage&eid=';
		// this is the encoded version of oneClickExport={"Format":"RIS","View":"CiteAbsKeyws"} but since it's always the same, no need to run encodeURL
	var eid = getEID(url);
	var rislink = baseUrl + eid + "&zone=recordPageHeader&outputType=export&txGid=0";
	Z.debug(rislink);
	let text = await requestText(rislink);
	// load translator for RIS
	// Z.debug(text)
	if (/T2 {2}-/.test(text) && /JF {2}-/.test(text)) {
		// SCOPUS RIS mishandles alternate titles and journal titles
		// if both fields are present, T2 is the alternate title and JF the journal title
		text = text.replace(/T2 {2}-/, "N1  -").replace(/JF {2}-/, "T2  -");
	}
	// Scopus places a stray TY right above the DB field
	text = text.replace(/TY.+\nDB/, "DB");
	// Some Journal Articles are oddly SER
	text = text.replace(/TY {2}- SER/, "TY  - JOUR");
	// Z.debug(text)
	var translator = Zotero.loadTranslator("import");
	translator.setTranslator("32d59d2d-b65a-4da4-b0a3-bdd3cfb979e7");
	translator.setString(text);
	translator.setHandler("itemDone", function (obj, item) {
		var notes = [];
		for (let note of item.notes) {
			if (/Export Date:|Source:/.test(note.note)) continue;
			notes.push(note);
		}
		item.notes = notes;
		item.url = "";
		for (var i = 0; i < item.creators.length; i++) {
			if (item.creators[i].fieldMode == 1 && item.creators[i].lastName.includes(" ")) {
				item.creators[i].firstName = item.creators[i].lastName.match(/\s(.+)/)[1];
				item.creators[i].lastName = item.creators[i].lastName.replace(/\s.+/, "");
				item.creators[i].fieldMode = 2;
			}
		}
		item.attachments.push({ document: doc, title: "Snapshot" });
		if (ISSN) item.ISSN = ZU.cleanISSN(ISSN);
		if (ISBN) item.ISBN = ZU.cleanISBN(ISBN);
		if (language) item.language = language.trim();
		item.complete();
	});
	await translator.translate();
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
