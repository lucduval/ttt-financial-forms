# Embedding the tax calculators in WordPress

There are two ways to put the calculators on the WordPress site. Both use the same snippet;
only the `src` address changes.

| Option | `src` | What visitors see |
|---|---|---|
| **One page for all calculators (recommended)** | `https://ttt-financial-forms.vercel.app/embed/calculators` | The hub: a searchable list of all 29 calculators. Tapping one opens it in the same spot, with an **← All calculators** link back to the list. |
| One calculator per page | `https://ttt-financial-forms.vercel.app/embed/<slug>` | That calculator only, with no back link. Use this for a page about one topic, e.g. a VAT article with the VAT calculator under it. |

Paste the snippet into a **Custom HTML** block (Gutenberg), the **Text** tab (Classic editor) or
an **HTML** widget (Elementor and similar).

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
  src="https://ttt-financial-forms.vercel.app/embed/calculators"
  title="TTT Tax Calculators"
  loading="lazy"
></iframe>
<script>
  (function () {
    window.addEventListener("message", function (e) {
      if (!e.data) return;
      var frames = document.querySelectorAll("iframe.ttt-calc-embed");
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].contentWindow !== e.source) continue;
        // Match the iframe's height to the calculator, so there is no inner scrollbar.
        if (e.data.type === "FORM_HEIGHT") frames[i].style.height = e.data.height + "px";
        // A new screen loaded inside the iframe (e.g. a calculator opened from the list).
        // If the visitor had scrolled past the top of it, bring the top back into view.
        if (e.data.type === "EMBED_PAGE_LOADED" && frames[i].getBoundingClientRect().top < 0) {
          frames[i].scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  })();
</script>
```

The `1400px` height is only the starting size; the iframe grows and shrinks with the content
once it loads.

## Slugs (for the one-calculator-per-page option)

`tax-calculator`, `tax-refund`, `bonus-tax`, `capital-gains-tax`, `retirement-lump-sum`,
`two-pot`, `travel-deduction`, `medical-aid-credits`, `tax-bracket`, `retrenchment-tax`,
`rental-income-tax`, `tfsa`, `donations-tax`, `company-car`, `uif`, `crypto-tax`,
`provisional-tax`, `provisional-taxpayer-check`, `home-office`, `vat`,
`small-business-income-tax`, `payroll-tax`, `local-interest`, `foreign-dividends`,
`retirement-savings`, `wear-and-tear`, `net-to-gross`, `hourly-to-salary`,
`property-transfer-cost`.

## If the calculator still looks narrow on a phone

Some themes put the content inside a container with `overflow:hidden`, which clips the breakout.
In that case, give the block a full-width alignment (Gutenberg: **Align → Full width**;
Elementor: set the section to **Full Width** with no column padding).
