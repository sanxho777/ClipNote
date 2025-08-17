

export function fromDealerDotCom(doc)= (doc.querySelector('h1') | null)?.innerText || '';
  const m = title.match(/(\d{4})\s+([A-Za-z][^\s]+)\s+(.+)/);
  const priceText = (doc.querySelector('[data-cmp="firstPrice"], .price') | null)?.innerText || '';
  const mileageText = (doc.querySelector('.mileage, [data-cmp="mileage"]') | null)?.innerText || '';

  const specs = Array.from(doc.querySelectorAll('li, tr')).map((el) => el.textContent || '');
  const out= {
    year: m ? parseInt(m[1], 10) ,
    make: m ? m[2] ,
    model: m ? m[3] ,
    price: priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) ,
    mileage: mileageText ? parseInt(mileageText.replace(/[^\d]/g, ''), 10) ;

  for (const txt of specs) {
    if (/VIN/i.test(txt)) out.vin = (txt.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i) || [])[0];
    if (/Exterior/i.test(txt)) out.exteriorColor = txt.split(':').pop()?.trim();
    if (/Interior/i.test(txt)) out.interiorColor = txt.split(':').pop()?.trim();
    if (/Transmission/i.test(txt)) out.transmission = txt.split(':').pop()?.trim();
    if (/Drivetrain|Drive Type/i.test(txt)) out.drivetrain = txt.split(':').pop()?.trim();
    if (/Engine/i.test(txt)) out.engine = txt.split(':').pop()?.trim();
    if (/Fuel/i.test(txt)) out.fuelType = txt.split(':').pop()?.trim();
    if (/Body Style/i.test(txt)) out.bodyStyle = txt.split(':').pop()?.trim();
    if (/Stock/i.test(txt)) out.stockNumber = (txt.match(/Stock[^\w]?\s*#?\s*(\S+)/i) || [])[1];
  }

  const dealerName =
    (doc.querySelector('.dealer-name, [data-qa="dealer-name"]') | null)?.innerText || undefined;
  const address = (doc.querySelector('.address, [data-qa="dealer-address"]') | null)?.innerText || '';
  out.dealer = {
    name,
    city: (address.match(/([A-Za-z\s]+),\s*[A-Z]{2}/) || [])[1],
    state: (address.match(/,\s*([A-Z]{2})/) || [])[1],
    zip: (address.match(/(\d{5})(?:-\d{4})?/) || [])[1],
    phone: (address.match(/(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/) || [])[1],
  };

  return out;
}
