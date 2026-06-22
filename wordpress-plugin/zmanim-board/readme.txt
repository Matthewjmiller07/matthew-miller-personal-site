=== Zmanim Board ===
Contributors: matthewjmiller07
Tags: zmanim, jewish, hebcal, shabbat, halacha
Requires at least: 5.8
Tested up to: 7.0
Requires PHP: 7.2
Stable tag: 1.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sof Zman Krias Shma board with weekly zmanim in a framed wood design. Live data from hebcal.com.

== Description ==

Displays a framed zmanim board showing:

* Sof Zman Krias Shma (GRA, with MGA below) for today, large
* This week's parasha and Hebrew date
* A full-week table: sunrise (netz), Krias Shma (GRA + MGA), and sunset
* Sof Zman Tefilla (GRA + MGA)

A city selector dropdown is built into the board (Jerusalem, Tel Aviv, Bnei Brak, Haifa, Beer Sheva, New York, Los Angeles, Chicago, London, Toronto, Montreal, Paris, Melbourne). Times come live from the hebcal.com API — nothing to maintain.

= Usage =

**Shortcode:**

`[zmanim_board]`

With options:

`[zmanim_board city="Jerusalem" max_width="500"]`

**Gutenberg block:** add the "Zmanim Board" block and pick the default city and max width in the sidebar.

You can place multiple boards on one page, each with its own city.

= Options =

* `city` — default city shown on load (visitors can change it via the dropdown). Partial matches work, e.g. `city="Tel Aviv"`. Default: New York.
* `max_width` — maximum width in pixels. The board scales down responsively. Default: 420.

== External Services ==

This plugin connects to the free Hebcal Jewish calendar API (hebcal.com) to retrieve the halachic times, weekly Torah portion, and Hebrew date shown on the board. No API key or account is required.

Requests are made from the site visitor's browser each time a board loads and whenever the visitor picks a different city from the dropdown. The following endpoints are used:

* `https://www.hebcal.com/zmanim` — daily zmanim. The request contains the selected city's latitude, longitude, and timezone, and the date being displayed.
* `https://www.hebcal.com/shabbat` — the week's Torah portion. The request contains the selected city's latitude, longitude, and timezone.
* `https://www.hebcal.com/converter` — the Hebrew date. The request contains the Gregorian date being displayed.

The coordinates sent are those of the city chosen from the plugin's fixed city list — never the visitor's own location. No personal data, cookies, or identifiers are sent by the plugin.

This service is provided by Hebcal: [about Hebcal](https://www.hebcal.com/home/about), [privacy policy](https://www.hebcal.com/home/about/privacy-policy), [API terms of service](https://www.hebcal.com/home/developer-apis).

== Frequently Asked Questions ==

= Where do the times come from? =

The widget fetches zmanim live from the free hebcal.com API in the visitor's browser. No API key needed. See the External Services section for details on what is sent.

= Can I add a city? =

The city list lives in `assets/zmanim-board.js` (the `CITIES` array) and `zmanim-board.php` (`zmanim_board_cities()`). Add an entry with label, latitude, longitude, and IANA timezone to both.

== Changelog ==

= 1.0.0 =
* Initial release. Shortcode, Gutenberg block, multi-instance support.
