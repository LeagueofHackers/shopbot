var request = require('request');
var properties = require('./properties');

module.exports = function (req, res, next) {


    var searchingForOffers = false;
    var keywordsAPIurlMapping =
    {
        "flipkart <Search for phone, laptop,etc>": "https://affiliate-api.flipkart.net/affiliate/search/json",
        "flipkart offers dotd" : "https://affiliate-api.flipkart.net/affiliate/offers/v1/dotd/json",
        "flipkart offers top" : "https://affiliate-api.flipkart.net/affiliate/offers/v1/top/json",
        "flipkart offers all" : "https://affiliate-api.flipkart.net/affiliate/offers/v1/all/json"
    };
    var userName = req.body.user_name;
    var botPayload = {};
    botPayload.username = "Hello "+userName+". Here are products based on your request:\n\n";
    botPayload.text =  botPayload.username;
    botPayload.channel = req.body.channel_id;
    botPayload.icon_emoji = ':game_die:';
    botPayload.response_type = "in_channel";

    text = req.body.text.trim();
    var isPriceSorted = text.indexOf("price");
    var type = "asc";
    if(isPriceSorted > -1) {
        type = text.substr().substr(text.length-4).trim();
        text = text.substr(0, isPriceSorted).trim();
    }
    var textArray = text.split(" ");
    var ecommerceWebsite = textArray[0];
    var searchStr = text.substring(textArray[0].length).trim();


    if(searchStr == "") {
        botPayload.text= "Hello " + userName;
        var suggestions = "Try these queries\n" +
            "dotd: Deals of the day: \n\n";
        for(key in keywordsAPIurlMapping) {
            suggestions+="/shop " + key + "\n";
        }
        suggestions += "Add 'price desc' at the end in search for price high to low. Default is price asc";
        botPayload.attachments = [
            {
                "text":suggestions
            }
        ];
        return res.status(200).json(botPayload);
    }
    var ApiUrl = keywordsAPIurlMapping["flipkart <Search for phone, laptop,etc>"];
    var product_data  = "";
    if(keywordsAPIurlMapping.hasOwnProperty(text)) {
        searchingForOffers = true;
        ApiUrl = keywordsAPIurlMapping[text];
    }

    var options = { method: 'GET',
        url: ApiUrl,
        qs: { query: searchStr, resultCount: '10' },
        headers:
        {
            'cache-control': 'no-cache',
            'fk-affiliate-token': properties.token,
            'fk-affiliate-id': properties.id
        }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        product_data = JSON.parse(body);
        botPayload.attachments = [];
        if(searchingForOffers) {
            var offersKey = {"offers top": "topOffersList", "offers all": "allOffersList", "offers dotd": "dotdList"};
            key = offersKey[searchStr];
            products = product_data[key];
            len = Math.min(products.length, 30);
            for (var p = 0; p < len; p++) {
                product = products[p];
                var image_url = "";
                for (var key in product.imageUrls) {
                    image_url = product.imageUrls[key].url;
                    break;
                }
                text = "Description : " + product.description + "\n";
                text += "Buy : <" + product.url + "| Go to " + ecommerceWebsite + ">\n\n";
                botPayload.attachments.push({
                    "title": product.title,
                    "text": text,
                    "thumb_url": image_url
                });
            }
        }
        else {
            products = product_data.productInfoList;
            var slack_data = "";
            products = sortByPrice(products, type);
            for (var p = 0; p < products.length; p++) {
                product = products[p];
                var image_url = "";
                for (var key in product.productBaseInfo.productAttributes.imageUrls) {
                    image_url = product.productBaseInfo.productAttributes.imageUrls[key];
                    break;
                }
                text = "Selling Price : INR " + product.productBaseInfo.productAttributes.sellingPrice.amount + "\n";
                text += "Max Price : INR " + product.productBaseInfo.productAttributes.maximumRetailPrice.amount + "\n";
                text += "Buy : <" + product.productBaseInfo.productAttributes.productUrl + "| Go to " + ecommerceWebsite + ">\n\n";
                botPayload.attachments.push({
                    "title": product.productBaseInfo.productAttributes.title,
                    "text": text,
                    "thumb_url": image_url
                });
            }
        }
        // avoid infinite loop
        if (userName !== 'slackbot') {
            return res.status(200).json(botPayload);
        } else {
            return res.status(200).end();
        }

    });
}

function sortByPrice(products, type) {
    //var productsSortedByOrder = products;
    var product_count = products.length;
    for(var p1 = 0 ;p1 < product_count; p1++) {
        minm_price = products[p1].productBaseInfo.productAttributes.sellingPrice.amount;
        var minm_index = p1;
        for(var p2 = p1+1; p2 < product_count; p2++) {
            if(products[p2].productBaseInfo.productAttributes.sellingPrice.amount < minm_price) {
                minm_index = p2;
                minm_price = products[p2].productBaseInfo.productAttributes.sellingPrice.amount;
            }
        }
        temp = products[p1];
        products[p1] = products[minm_index];
        products[minm_index] = temp;
    }
    if(type == "desc") {
        products.reverse();
    }
    return products;
}