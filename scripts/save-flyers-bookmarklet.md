# Saving flyers off a page you're already viewing

Instagram serves the full-resolution image in the page, but buries it behind
`srcset` — which is why finding it means opening DevTools. This does that part
for you.

It reads the page **you have already opened yourself**, when you click it. No
stored credentials, no headless browser, nothing running in the background. It
is a faster "view source", not an automated crawler.

> A note worth reading once: automated collection is against Instagram's terms.
> This is deliberately manual — you navigate, you scroll, you click. Keep it
> that way. Don't leave it running, and don't point it at anything but your own
> saved collection.

## Setup

Make a new bookmark in your bookmarks bar, name it **Save flyers**, and paste
this as the URL:

```
javascript:(()=>{const%20best=i=>{const%20s=i.getAttribute('srcset');if(!s)return%20i.currentSrc||i.src;return%20s.split(',').map(p=>{const%20b=p.trim().split(/\s+/);return{u:b[0],w:parseInt(b[1])||0}}).sort((a,b)=>b.w-a.w)[0].u};const%20seen=new%20Set();const%20urls=[...document.querySelectorAll('img')].filter(i=>i.naturalWidth>=320&&i.naturalHeight>=320).map(best).filter(u=>u&&!seen.has(u)&&seen.add(u));if(!urls.length)return%20alert('No%20images%20found.%20Scroll%20so%20the%20flyers%20load,%20then%20click%20again.');const%20w=window.open('','_blank');w.document.write('<title>'+urls.length+'%20flyers</title><body%20style="font:14px%20system-ui;padding:20px"><p><b>'+urls.length+'%20images.</b>%20Right-click%20→%20Save%20image,%20or%20use%20the%20list%20below%20with%20curl.</p><textarea%20style="width:100%25;height:160px">'+urls.join('\n')+'</textarea><div>'+urls.map(u=>'<img%20src="'+u+'"%20style="max-width:220px;margin:6px;vertical-align:top">').join('')+'</div>');w.document.close()})()
```

## Using it

1. Open your saved collection and **scroll until the flyers you want have
   loaded** — the bookmarklet only sees what the page has actually rendered.
2. Click **Save flyers**.
3. A new tab opens with every image at full resolution, plus a text box of the
   URLs.
4. Either right-click each image and save it, or copy the URL list and use the
   downloader below.

Drop the files into `flyer-inbox/`, then:

```bash
cd services/annex_scout && ./venv/bin/python import_flyers.py --dry-run
```

Check what it read, then run it again without `--dry-run`. Everything lands as
**pending** in `/admin` for you to approve.

## Bulk downloader

Paste the URL list into a file and run this from `flyer-inbox/`:

```bash
i=0; while read -r u; do [ -z "$u" ] && continue; i=$((i+1)); curl -sL "$u" -o "flyer-$i.jpg"; done < urls.txt
```

## If it finds nothing

The filter ignores images under 320×320 to skip avatars and icons. If a grid
shows only thumbnails, open a post first — the full-size image loads then.
