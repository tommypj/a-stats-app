export const extractSectionTitles = (htmlString) => {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const h2Elements = doc.querySelectorAll('h2');
        const titles = Array.from(h2Elements).map(h2 => h2.textContent.trim());
        return titles.filter(title => title.length > 0);
    } catch (e) {
        console.error("Failed to parse HTML to extract titles:", e);
        return [];
    }
};
