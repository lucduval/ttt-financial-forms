# Embedding the tax calculators in WordPress

Each calculator has an embeddable page at `https://ttt-financial-forms.vercel.app/embed/<slug>`,
and the hub is at `/embed/calculators`. Paste the snippet below into a **Custom HTML** block
(Gutenberg), the **Text** tab (Classic editor) or an **HTML** widget (Elementor and similar).
Change only the `src` slug.

```html
<style>
  .ttt-calc-embed { display:block; width:100%; height:1400px; border:0; }
  /* On phones, break out of the theme's content column so the calculator
     uses the full screen width instead of being squeezed by the side padding. */
  @media (max-width: 640px) {
    .ttt-calc-embed { width:100vw; max-width:100vw; margin-left:calc(50% - 50vw); }
  }
</style>
<iframe
  class="ttt-calc-embed"
  src="https://ttt-financial-forms.vercel.app/embed/bonus-tax"
  title="TTT Tax Calculator"
  loading="lazy"
></iframe>
<script>
  (function () {
    window.addEventListener("message", function (e) {
      if (!e.data || e.data.type !== "FORM_HEIGHT") return;
      var frames = document.querySelectorAll("iframe.ttt-calc-embed");
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow === e.source) frames[i].style.height = e.data.height + "px";
      }
    });
  })();
</script>
```

The calculator sends its height to the page, so the iframe grows and shrinks with the content
and never shows its own scrollbar. The `1400px` height is only the starting size before the
first message arrives.

## Slugs

`tax-calculator`, `tax-refund`, `bonus-tax`, `capital-gains-tax`, `retirement-lump-sum`,
`two-pot`, `travel-deduction`, `medical-aid-credits`, `tax-bracket`, `retrenchment-tax`,
`rental-income-tax`, `tfsa`, `donations-tax`, `company-car`, `uif`, `crypto-tax`,
`provisional-tax`, `provisional-taxpayer-check`, `home-office`, `vat`,
`small-business-income-tax`, `payroll-tax`, `local-interest`, `foreign-dividends`,
`retirement-savings`, `wear-and-tear`, `net-to-gross`, `hourly-to-salary`,
`property-transfer-cost`, and `calculators` for the hub.

## If the calculator still looks narrow on a phone

Some themes put the content inside a container with `overflow:hidden`, which clips the breakout.
In that case, give the block a full-width alignment (Gutenberg: **Align → Full width**;
Elementor: set the section to **Full Width** with no column padding).
