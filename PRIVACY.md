# Privacy Policy

Effective date: 2026-06-16

Clozemaster Multilingual Helper translates Clozemaster text into a target language selected by the user. This extension does not run a developer-operated server and does not sell user data.

This extension is unofficial and is not affiliated with, endorsed by, or produced by Clozemaster.

## Data Stored Locally

The extension stores the following data in `chrome.storage.local`:

- Google Cloud Translation API key, if provided by the user.
- DeepL API key, if provided by the user.
- Selected translation provider.
- Selected target language.
- Explanation display preference.
- Cached translation results.

This data is stored locally in the user's Chrome profile.

## Data Sent To Third Parties

When translation is requested, the extension sends the text to translate, source language when detected, target language, and the relevant user-provided API key to the selected translation provider:

- Google Cloud Translation API, when Google is selected.
- DeepL API, when DeepL is selected.

The extension only sends this data to provide the translation feature requested by the user.

## Data Not Collected

The extension does not collect analytics, browsing history, account credentials, payment information, health information, or location data for the developer.

## Data Sharing And Sale

The developer does not sell, rent, or transfer user data for advertising, analytics, credit, or data brokerage purposes. Data is transferred to Google Cloud Translation or DeepL only when necessary to provide the translation feature.

## Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Security

Translation requests are sent over HTTPS. Users should treat their translation API keys as secrets and should revoke or rotate them through Google Cloud or DeepL if they believe a key has been exposed.

## Contact

For privacy or support requests, use the support contact listed on the Chrome Web Store listing or the project repository.
