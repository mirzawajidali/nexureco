"""Clean admin-entered rich text (product descriptions, CMS pages) before it's stored.

The storefront shows this HTML as-is, so anything that can run script (``<script>``, ``onerror=``,
``javascript:`` links, ``<iframe>``, ...) is removed. What the admin's rich text editor and the CMS
templates produce (headings, lists, links, images, tables, text colour and alignment) is kept.
The storefront also cleans it again when rendering (DOMPurify), which covers content saved before this.
"""
import nh3

_TAGS = {
    "p", "br", "hr", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "del", "ins", "mark", "small", "sub", "sup", "code", "pre",
    "blockquote", "ul", "ol", "li", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
}

_ATTRIBUTES = {
    "*": {"class", "style"},
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height", "loading"},
    "ol": {"start", "type"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan", "scope"},
}

# Inline styles the editor uses (text colour, highlight, alignment); anything else is dropped
_STYLE_PROPERTIES = {"color", "background-color", "text-align", "font-weight", "font-style", "text-decoration"}


def sanitize_html(html: str | None) -> str | None:
    if not html:
        return html
    return nh3.clean(
        html,
        tags=_TAGS,
        clean_content_tags={"script", "style", "iframe", "object", "embed", "noscript", "template"},
        attributes=_ATTRIBUTES,
        url_schemes={"http", "https", "mailto", "tel"},
        filter_style_properties=_STYLE_PROPERTIES,
        link_rel="noopener noreferrer",
    )
