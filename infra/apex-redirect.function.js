// CloudFront Function (viewer-request), runtime cloudfront-js-1.0.
// Canonicalizes every request to https://tangram.space, preserving path and query string.
// http->https is already handled by the distribution's ViewerProtocolPolicy (redirect-to-https);
// this function only handles host canonicalization (www.tangram.space -> tangram.space).
function handler(event) {
    var request = event.request;
    var host = request.headers.host && request.headers.host.value;

    if (host && host !== 'tangram.space') {
        var qs = '';
        var keys = Object.keys(request.querystring);
        if (keys.length > 0) {
            var parts = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var item = request.querystring[key];
                if (item.multiValue) {
                    for (var j = 0; j < item.multiValue.length; j++) {
                        parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(item.multiValue[j].value));
                    }
                } else {
                    parts.push(encodeURIComponent(key) + (item.value ? '=' + encodeURIComponent(item.value) : ''));
                }
            }
            qs = '?' + parts.join('&');
        }

        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                'location': { value: 'https://tangram.space' + request.uri + qs }
            }
        };
    }

    return request;
}
