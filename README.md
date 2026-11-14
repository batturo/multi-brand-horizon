# Multi Brand Horizon

Website for Multi Brand Horizon, 347, Phase 1-B, Shivalik Avenue, Naya Nangal, Punjab - 140126.

Live site: https://batturo.github.io/multi-brand-horizon/

Everything the site shows comes from one file: [`data/catalog.json`](data/catalog.json).
Edit it on GitHub (open the file, click the pencil icon, then **Commit changes**). The site updates within a minute or two.

## Add a product

1. Upload the photo to the [`images`](images) folder (**Add file → Upload files**). JPG or PNG, ideally square and under 1 MB.
2. Open `data/catalog.json` and add an entry inside `"products": [ ... ]`. Put a comma between entries.

```json
{
  "name": "Slim Fit Jeans",
  "brand": "Levi's",
  "category": "fashion",
  "section": "Jeans",
  "price": 2499,
  "mrp": 3299,
  "description": "Stretch denim. Waist 28 to 38.",
  "image": "images/slim-fit-jeans.jpg",
  "inStock": true,
  "featured": false,
  "added": "2026-11-20"
}
```

| Field | What to put |
|---|---|
| `category` | One of `fashion`, `electronics`, `home-living`, `gifts`, `sports`, `more` |
| `section` | A subsection name exactly as written under `departments`, or `""` for none |
| `price` | Selling price as a number, or `null` to show "Price in store" |
| `mrp` | Original price as a number to show a discount, or `null` |
| `inStock` | `true` or `false` (shows "Sold out") |
| `featured` | `true` to show it first under New arrivals on the home page |
| `added` | Date added, `YYYY-MM-DD`. Newest show first |

## Change subsections

Edit the lists under `"departments"`. Order in the list is the order on the website.

## Store details

Edit the fields under `"store"`. Put the phone and WhatsApp number in to turn on the
"Ask about this item" buttons on every product. Hours use one line per day or range;
write `\n` between lines, e.g. `"Monday to Saturday: 10:00 am – 7:00 pm\nSunday: Closed"`.
