const xpath = require('xpath');
const dom = require('xmldom').DOMParser;
const xpathNamespaces = require('./xpathNamespaces');

const select = xpath.useNamespaces(xpathNamespaces());

const retrieveReadLiveStudent = (documentXml, headerXml) => {
    const headerDoc = new dom().parseFromString(headerXml.toString());
    const headerTr = select('//w:hdr/w:tbl/w:tr', headerDoc);
    const headerResult = [];
    headerTr.forEach(item => {
        const doc = new dom().parseFromString(item.toString());
        const result = select('//w:tc/w:p', doc);

        headerResult.push(retrieveParagraphsContent(result, 'header'));
    });

    const bodyDoc = new dom().parseFromString(documentXml.toString());
    const bodySdt = select('//w:document/w:body/w:sdt', bodyDoc);
    const bodyResult = [];

    bodySdt.forEach(item => {
        const doc = new dom().parseFromString(item.toString());
        const result = select('//w:sdtContent/w:p', doc);

        bodyResult.push(retrieveParagraphsContent(result, 'body'));
    });

    return { header: headerResult, body: bodyResult };
}

const retrieveParagraphsContent = (paragraphs, paragraphsType) => {
    const paragrapthsResult = [];

    paragraphs.forEach(paragrapth => {
        const doc = new dom().parseFromString(paragrapth.toString());
        const textResult = select('//w:r/w:t/text()', doc);
        const bodyText = [];
        let paragrapthText = '';

        textResult.forEach(text => {
            if (paragraphsType === 'body') {
                const r = select(`//w:r[w:t[text()='${text.nodeValue}']]`, doc);
                const isBold = retrieveWordStyles(r, 'b');
                const isItalic = retrieveWordStyles(r, 'i');
                const isUnderlined = retrieveWordStyles(r, 'u');

                bodyText.push({ text: text.nodeValue, isBold, isItalic, isUnderlined });
            } else {
                paragrapthText += text.nodeValue;
            }
        });

        paragrapthsResult.push(paragraphsType === 'body' ? bodyText : paragrapthText);
    });

    return paragrapthsResult.filter(item => !!item[0]);
};

const retrieveDescriptionInfo = documentXml => {
    const doc = new dom().parseFromString(documentXml.toString());
    const result = filterDiscriptionParagraphs(select('//w:document/w:body/w:p', doc));
    const descriptionInfoContent = retrieveParagraphsContent(result, 'descriptionInfo');

    return groupDecriptionInfo(descriptionInfoContent);
};

const groupDecriptionInfo = descriptionInfoContent => {
    const descriptionInfoResult = [];

    for (let i = 0; i < descriptionInfoContent.length; i += 2) {
        const storyTitle = descriptionInfoContent[i];
        const keyWords = descriptionInfoContent[i + 1];

        descriptionInfoResult.push({ storyTitle, keyWords  });
    }

    return descriptionInfoResult;
}

const filterDiscriptionParagraphs = paragraphs => {
    return paragraphs.filter(paragraph => {
        const doc = new dom().parseFromString(paragraph.toString());
        const result = select('//w:r/w:rPr/w:rStyle/@w:val', doc);

        return !!result.length;
    });
}

const retrieveWordStyles = (r, style) => {
    const doc = new dom().parseFromString(r.toString());
    const result = select(`//w:${style}`, doc);

    return !!result.length;
};

const startXPathParsing = async (documentXml, headerXml) => {
    const { header, body } = retrieveReadLiveStudent(documentXml, headerXml);
    const descriptionInfo = retrieveDescriptionInfo(documentXml);

    return { header, body, descriptionInfo };
}

module.exports = { startXPathParsing };
