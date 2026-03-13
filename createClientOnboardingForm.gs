/**
 * =============================================================================
 * CLIENT ONBOARDING FORM — Google Apps Script
 * =============================================================================
 * INSTRUCTIONS:
 *  1. Go to https://script.google.com → New project
 *  2. Delete all boilerplate and paste this entire file
 *  3. Click ▶ Run → select "createOnboardingForm"
 *  4. Approve the OAuth prompt (Forms + Sheets + Drive)
 *  5. Open View → Logs — the Form URL and Sheet ID are printed there
 *  6. Re-run for each new client — no edits required
 *
 * NOTE: File-upload questions require a Google Workspace account.
 *       This script uses a Drive-link field instead, which works on
 *       any Gmail account and is more practical for large assets.
 * =============================================================================
 */

function createOnboardingForm() {

  // ── 1. Create the form ────────────────────────────────────────────────────
  var form = FormApp.create('Shopify-to-Mobile App — Client Onboarding');
  form.setTitle('Shopify-to-Mobile App — Client Onboarding');
  form.setDescription(
    'Please complete all required fields so we can configure your white-label ' +
    'mobile app. This typically takes 5–10 minutes.'
  );
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);
  form.setCollectEmail(false);

  // ── 2. Page 1 — Core credentials & logo check ────────────────────────────

  // Q1 — Business name
  form.addTextItem()
    .setTitle('Business name')
    .setRequired(true);

  // Q2 — Shopify store URL
  form.addTextItem()
    .setTitle('Shopify store URL')
    .setHelpText('e.g. https://yourstore.myshopify.com')
    .setRequired(true);

  // Q3 — Shopify Admin API access token
  form.addTextItem()
    .setTitle('Shopify Admin API access token')
    .setHelpText('Found in Shopify Admin → Apps → Private Apps')
    .setRequired(true);

  // Q4 — Firebase project ID
  form.addTextItem()
    .setTitle('Firebase project ID')
    .setHelpText('Found in Firebase Console → Project Settings')
    .setRequired(true);

  // Q5 — Vector logo? (drives conditional navigation to Page 2 or Page 3)
  var logoChoiceItem = form.addMultipleChoiceItem();
  logoChoiceItem
    .setTitle('Do you have a vector logo? (SVG or AI file)')
    .setRequired(true);

  // ── 3. Page 2 — Logo upload link (shown when "Yes") ──────────────────────
  var logoUploadPage = form.addPageBreakItem();
  logoUploadPage.setTitle('Logo Upload');
  // This page goes to Page 4 (brand) — skips the upsell
  // (setGoToPage wired after all pages are created below)

  // Q6a — Google Drive sharing link for high-res logo
  form.addTextItem()
    .setTitle('Google Drive link — high-res logo (PNG or SVG)')
    .setHelpText(
      'Upload your logo to Google Drive, set sharing to "Anyone with the link can view", ' +
      'then paste the link here. Max recommended file size: 10 MB.'
    )
    .setRequired(true);

  // ── 4. Page 3 — Logo upsell (shown when "No") ────────────────────────────
  var upsellPage = form.addPageBreakItem();
  upsellPage.setTitle('No Vector Logo? No Problem.');
  // This page continues to Page 4 automatically

  form.addSectionHeaderItem()
    .setTitle(
      'No vector logo? No problem. We offer a professional logo ' +
      'vectorisation and design package for £150. ' +
      'Tick below to add it to your project.'
    );

  form.addCheckboxItem()
    .setTitle('Logo design package add-on')
    .setChoiceValues(['Yes, add the £150 logo design package to my project']);

  // Q6b — Optional raster/draft logo link for clients without a vector logo
  form.addTextItem()
    .setTitle('Google Drive link — current logo (any format, optional)')
    .setHelpText(
      'If you have any existing logo file (JPG, PNG, PDF etc.), share it via ' +
      'Google Drive and paste the link here. Leave blank if you have nothing yet.'
    )
    .setRequired(false);

  // ── 5. Page 4 — Brand colours & store listing ────────────────────────────
  var brandPage = form.addPageBreakItem();
  brandPage.setTitle('Brand & Store Listing');

  // Q7 — Primary brand hex colour
  form.addTextItem()
    .setTitle('Primary brand hex colour')
    .setHelpText(
      'This will be used for the tab bar, buttons, and notification badge — e.g. #008060'
    )
    .setRequired(true);

  // Q8 — Secondary brand hex colour (optional)
  form.addTextItem()
    .setTitle('Secondary brand hex colour')
    .setHelpText('e.g. #004C3F — leave blank if not applicable')
    .setRequired(false);

  // Q9 — Short description (max 80 chars)
  form.addParagraphTextItem()
    .setTitle('App Store / Play Store short description')
    .setHelpText(
      'One sentence shown under your app name in the stores (max 80 characters)'
    )
    .setRequired(true);

  // Q10 — Long description (max 4000 chars)
  form.addParagraphTextItem()
    .setTitle('App Store / Play Store long description')
    .setHelpText(
      "Describe your app's features. This appears on your store listing page (max 4000 characters)"
    )
    .setRequired(true);

  // ── 6. Wire conditional navigation on Q5 ─────────────────────────────────
  // Retrieve pages in creation order:
  //   allPages[0] = Page 2 (logo upload — Yes branch)
  //   allPages[1] = Page 3 (upsell      — No  branch)
  //   allPages[2] = Page 4 (brand colours & descriptions)
  var allPages   = form.getItems(FormApp.ItemType.PAGE_BREAK);
  var yesPage    = allPages[0].asPageBreakItem(); // Page 2
  var noPage     = allPages[1].asPageBreakItem(); // Page 3
  var finalPage  = allPages[2].asPageBreakItem(); // Page 4

  // Yes branch: upload page → skip upsell → go straight to brand page
  yesPage.setGoToPage(finalPage);
  // No branch: upsell page → continue naturally into brand page (default)
  noPage.setGoToPage(FormApp.PageNavigationType.CONTINUE);

  // Attach choices with navigation targets
  logoChoiceItem.setChoices([
    logoChoiceItem.createChoice('Yes', yesPage),  // → Page 2
    logoChoiceItem.createChoice('No',  noPage)    // → Page 3
  ]);

  // ── 7. Link a Google Sheet to collect responses ───────────────────────────
  var sheet = SpreadsheetApp.create(
    'Onboarding Responses — ' + new Date().toLocaleDateString('en-GB')
  );
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  // ── 8. Make form shareable without sign-in ───────────────────────────────
  var formFile = DriveApp.getFileById(form.getId());
  formFile.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  // ── 9. Output results ─────────────────────────────────────────────────────
  Logger.log('=== FORM CREATED SUCCESSFULLY ===');
  Logger.log('Form URL  : ' + form.getPublishedUrl());
  Logger.log('Edit URL  : ' + form.getEditUrl());
  Logger.log('Sheet ID  : ' + sheet.getId());
  Logger.log('Sheet URL : ' + sheet.getUrl());
}
