const urlm = require('url');

function addPagenoToUrl(req, pageno) {
    const url = new urlm.URL(req.protocol + "://" + req.get('host') + req.baseUrl + req.url);
    url.searchParams.set("pageno", pageno);
    return url.href;
}


// Helper function used to paginate.
// Return the HTML links used to paginate.
//
exports.paginate = (totalItems, itemsPerPage, currentPage, req, param_name) => {

    if (totalItems <= itemsPerPage) {
        return false;
    }

    const total = Math.ceil(totalItems / itemsPerPage);

    // Number of links to show before and after the current page.
    // In addition to these, the first, last and intermediate links are also shown
    let neighbours = 2; // items a mostrar alrededor el la pagina actuañ

    const html = [];

    html.push('<ul class="pagination">');

    // Modify neighbors to avoid having few buttons:
    //  - If there is no space for the neighbors on the left, I show more by the right.
    //  - If there is no space for the neighbors on the right, I show more by the left.
    if (currentPage - neighbours <= 2) {
        neighbours += 3 + neighbours - currentPage;
    } else if (total - currentPage - neighbours <= 1) {
        neighbours += 2 - total + currentPage + neighbours;
    }

    // First page
    if (1 < currentPage - neighbours) {
        const url = addPagenoToUrl(req, 1, param_name);
        html.push('<li> <a href="' + url + '">' + 1 + '</a></li>');
    }

    // Previous pages: between the first page and the middle pages
    if (currentPage - neighbours > 2) {
        const n = Math.trunc(( 1 + currentPage - neighbours) / 2);
        const url = addPagenoToUrl(req, n, param_name);
        html.push('<li> <a href="' + url + '">' + n + '</a></li>');
    }

    // Pages in the middle
    for (let i = 1; i <= total; i++) {
        if (i === currentPage) {
            html.push('<li class="active"> <a href="#">' + i + '</a></li>');
        } else {
            if (i >= currentPage - neighbours && i <= currentPage + neighbours) {
                const url = addPagenoToUrl(req, i, param_name);
                html.push('<li> <a href="' + url + '">' + i + '</a></li>');
            }
        }
    }

    // Next pages: betwenn the middle pages and the last page
    if (currentPage + neighbours < total - 1) {
        const n = Math.trunc(( total + currentPage + neighbours + 1) / 2);
        const url = addPagenoToUrl(req, n, param_name);
        html.push('<li> <a href="' + url + '">' + n + '</a></li>');
    }

    // Last page
    if (total > currentPage + neighbours) {
        const url = addPagenoToUrl(req, total, param_name);
        html.push('<li> <a href="' + url + '">' + total + '</a></li>');
    }

    html.push('</ul>');

    return html.join('');
};