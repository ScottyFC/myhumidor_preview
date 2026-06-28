-- Phase 103 — retailer logos for ABC Fine Wine & Spirits and Total Wine & More.
-- Only sets image_url where not already set, so claimed locations keep custom images.
update public.lounges set image_url = 'https://cdn11.bigcommerce.com/s-t5ovgcn8tc/images/stencil/420w/abc-osf-logo_1703105792__45611.original.png' where name like 'ABC Fine Wine%' and (image_url is null or image_url = '');
update public.lounges set image_url = 'https://www.totalwine.com/site/binaries/t1766586211122/heroLarge/content/gallery/module-images/global-nav/twm-logo-color.svg' where name like 'Total Wine%' and (image_url is null or image_url = '');
