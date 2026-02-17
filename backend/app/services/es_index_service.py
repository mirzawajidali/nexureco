PRODUCTS_INDEX = "products"

PRODUCTS_SETTINGS = {
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "analysis": {
            "analyzer": {
                "autocomplete_analyzer": {
                    "type": "custom",
                    "tokenizer": "autocomplete_tokenizer",
                    "filter": ["lowercase", "asciifolding"],
                },
                "search_analyzer": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding"],
                },
            },
            "tokenizer": {
                "autocomplete_tokenizer": {
                    "type": "edge_ngram",
                    "min_gram": 2,
                    "max_gram": 15,
                    "token_chars": ["letter", "digit"],
                }
            },
        },
    },
    "mappings": {
        "properties": {
            "name": {
                "type": "text",
                "analyzer": "autocomplete_analyzer",
                "search_analyzer": "search_analyzer",
                "fields": {
                    "exact": {"type": "keyword"},
                    "standard": {"type": "text", "analyzer": "standard"},
                },
            },
            "description": {"type": "text", "analyzer": "standard"},
            "short_description": {"type": "text", "analyzer": "standard"},
            "sku": {"type": "keyword"},
            "tags": {"type": "keyword"},
            "slug": {"type": "keyword"},
            "status": {"type": "keyword"},
            "category_id": {"type": "integer"},
            "category_name": {"type": "keyword"},
            "category_slug": {"type": "keyword"},
            "base_price": {"type": "float"},
            "compare_at_price": {"type": "float"},
            "is_featured": {"type": "boolean"},
            "total_sold": {"type": "integer"},
            "avg_rating": {"type": "float"},
            "review_count": {"type": "integer"},
            "created_at": {"type": "date"},
            "primary_image": {"type": "keyword", "index": False},
            "variant_count": {"type": "integer", "index": False},
            "total_stock": {"type": "integer", "index": False},
            "variant_images": {"type": "keyword", "index": False},
        }
    },
}
