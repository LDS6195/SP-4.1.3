# Market Hype

The booking card and venue picker include a Heatmap button. The USA view shows
state-level strength and local market pins; the World view shows national reach.
The market list and selected-market panel show company hype, past shows, venue
access, upfront costs, and attendance/profit forecasts for the current card.
Inspecting a market never changes the booked venue. Booking from the map uses
the same GM-level restrictions as the ordinary venue picker.

## Growth

- New companies begin with a small Austin following and limited Southern reach.
- PPVs build the most hype in the city where they run, with a smaller regional gain.
- At ratings of 35 or higher, local gains range from 5 to 17 points per PPV.
- Ratings below 35 reduce local and regional hype instead.
- Successful broadcasts above a 50 rating build national awareness in proportion
  to TV viewers. Stronger broadcasts eventually spread awareness globally.
- House shows grow the company's home market at 40% of the PPV local rate and
  provide no broadcast spillover.
- Existing local hype fades by 0.5% per PPV; regional hype fades by 0.2%.
- All hype scores are capped at 100. Separate venues in one city share a market.

## Attendance

Company market hype is separate from the venue's built-in market heat. Effective
local hype combines the city following with regional/national and global reach.
It multiplies projected audience demand by `0.85 + hype * 0.008`, ranging from
0.85 in an unknown market to 1.65 at maximum hype. Venue capacity still caps
attendance, and normal booking quality, prices, goodwill, freshness, and
advertising still apply. Financial safety floors are unchanged.

## Legend

| Hype | Status | Color |
| --- | --- | --- |
| 0-14 | Unknown | Gray |
| 15-34 | Emerging | Blue |
| 35-59 | Growing | Green |
| 60-79 | Hot | Yellow |
| 80-100 | Red hot | Red |

State colors combine wider regional reach with local market strength. World
country colors and markers show national/global awareness; the market table
continues to show individual cities.

## Saves

Market hype, country/region reach, and visit counts are stored in the existing
game save and included in exports. Older saves initialize market history from
archived PPVs where a venue or city can be identified. Archived shows without
TV-viewer data rebuild local reach without inventing broadcast audiences.