{
	"translatorID": "1678888-40fe-4a49-896e-62711c1678888",
	"label": "SAL",
	"creator": "ChrisSG",
	"target": "^https?://.*lawnet.*",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2025-04-15 15:00:52"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2025 ChrisSG

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.includes("contentDocID=")) {
		return "case";
	}
	return false;
}


function scrapeCase(doc, url) {
	var newItem = new Zotero.Item("case");

	// Get raw title and clean it
	var rawTitleNode = ZU.xpath(doc, '//title')[0];
	if (rawTitleNode) {
		var html = rawTitleNode.innerHTML || rawTitleNode.textContent;
		var clean = html.replace(/<[^>]*>/g, '').trim();
		var parts = clean.split(',');
		if (parts.length > 1 && parts[0].trim() === parts[1].trim()) {
			newItem.title = parts[0].trim();
		} else {
			newItem.title = clean;
		}
	}

	// Try to extract court info
	var court = ZU.xpathText(doc, '//td[contains(text(), "Tribunal/Court")]/following-sibling::td[@class="txt-body"]');
	if (!court) {
		// Fallback if direct sibling didn't work
		court = ZU.xpathText(doc, '//td[contains(text(), "Tribunal/Court")]/../td[@class="txt-body"]');
	}
	newItem.court = court;

	// Try to extract citation text and parse
	var citationText = ZU.xpathText(doc, '//div[@class="titleCitation"]');
	Zotero.debug("Citation raw: " + citationText);

	if (citationText) {
		var cleanCitation = citationText.replace(/\u00A0/g, ' ');
		var match = cleanCitation.match(/\[(\d{4})\]\s+(\d+)\s+([A-Z()]+)\s+(\d+)/);
		if (match) {
			newItem.dateDecided = match[1];        // "2012"
			newItem.reporterVolume = match[2];     // "1"
			newItem.reporter = match[3];           // "SGCA", "SGHC", "SLR", etc.
			newItem.firstPage = match[4];          // "32"
		}
	}

	// Set URL
	newItem.url = url;

	newItem.complete();
}

async function doWeb(doc, url) {
	if (detectWeb(doc, url) === "case") {
		await scrapeCase(doc, url);
	}
	else if (detectWeb(doc, url) === 'multiple') {
		let items = await Zotero.selectItems(getSearchResults(doc, false));
		if (!items) return;
		for (let url of Object.keys(items)) {
			let newDoc = await Zotero.Utilities.processDocuments([url]);
			await scrapeCase(newDoc, url);
		}
	}
}

/** BEGIN TEST CASES **/
var testCases = [
]
/** END TEST CASES **/
