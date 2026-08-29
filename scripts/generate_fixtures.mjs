import { writeFileSync } from "node:fs";
import { join } from "node:path";

const episodesData = [
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W1",
    slug: "wtf-nikhil-kamath-ep-01-ecommerce",
    title: "WTF with Nikhil Kamath - Episode 1: The Future of E-Commerce & Retail",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A001",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A002",
    uncut_duration_sec: 5400.0,
    published_duration_sec: 5280.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 60.0, pub_start_sec: 0.0, pub_end_sec: 0.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 60.0, uncut_end_sec: 1800.0, pub_start_sec: 0.0, pub_end_sec: 1740.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 1800.0, uncut_end_sec: 1920.0, pub_start_sec: 1740.0, pub_end_sec: 1740.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 1920.0, uncut_end_sec: 3600.0, pub_start_sec: 1740.0, pub_end_sec: 3420.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 3600.0, uncut_end_sec: 3600.0, pub_start_sec: 3420.0, pub_end_sec: 3480.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 3600.0, uncut_end_sec: 5400.0, pub_start_sec: 3480.0, pub_end_sec: 5280.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W2",
    slug: "wtf-nikhil-kamath-ep-02-ai-coding",
    title: "WTF with Nikhil Kamath - Episode 2: AI Revolution & Future of Coding",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A003",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A004",
    uncut_duration_sec: 7200.0,
    published_duration_sec: 6960.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 0.0, pub_start_sec: 0.0, pub_end_sec: 30.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 0.0, uncut_end_sec: 2000.0, pub_start_sec: 30.0, pub_end_sec: 2030.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 2000.0, uncut_end_sec: 2180.0, pub_start_sec: 2030.0, pub_end_sec: 2030.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 2180.0, uncut_end_sec: 4200.0, pub_start_sec: 2030.0, pub_end_sec: 4050.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 4200.0, uncut_end_sec: 4200.0, pub_start_sec: 4050.0, pub_end_sec: 4110.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 4200.0, uncut_end_sec: 4350.0, pub_start_sec: 4110.0, pub_end_sec: 4110.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 6, uncut_start_sec: 4350.0, uncut_end_sec: 7200.0, pub_start_sec: 4110.0, pub_end_sec: 6960.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W3",
    slug: "wtf-nikhil-kamath-ep-03-clean-energy",
    title: "WTF with Nikhil Kamath - Episode 3: Clean Energy, Nuclear & Grid Tech",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A005",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A006",
    uncut_duration_sec: 6000.0,
    published_duration_sec: 5760.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 120.0, pub_start_sec: 0.0, pub_end_sec: 0.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 120.0, uncut_end_sec: 1500.0, pub_start_sec: 0.0, pub_end_sec: 1380.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 1500.0, uncut_end_sec: 1500.0, pub_start_sec: 1380.0, pub_end_sec: 1440.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 1500.0, uncut_end_sec: 3200.0, pub_start_sec: 1440.0, pub_end_sec: 3140.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 3200.0, uncut_end_sec: 3440.0, pub_start_sec: 3140.0, pub_end_sec: 3140.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 3440.0, uncut_end_sec: 4800.0, pub_start_sec: 3140.0, pub_end_sec: 4500.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 6, uncut_start_sec: 4800.0, uncut_end_sec: 4800.0, pub_start_sec: 4500.0, pub_end_sec: 4560.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 7, uncut_start_sec: 4800.0, uncut_end_sec: 6000.0, pub_start_sec: 4560.0, pub_end_sec: 5760.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W4",
    slug: "wtf-nikhil-kamath-ep-04-longevity",
    title: "WTF with Nikhil Kamath - Episode 4: Health, Longevity & Biohacking",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A007",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A008",
    uncut_duration_sec: 9000.0,
    published_duration_sec: 6360.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 1800.0, pub_start_sec: 0.0, pub_end_sec: 1800.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 1800.0, uncut_end_sec: 4500.0, pub_start_sec: 1800.0, pub_end_sec: 1800.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 4500.0, uncut_end_sec: 4500.0, pub_start_sec: 1800.0, pub_end_sec: 1860.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 4500.0, uncut_end_sec: 9000.0, pub_start_sec: 1860.0, pub_end_sec: 6360.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W5",
    slug: "wtf-nikhil-kamath-ep-05-real-estate",
    title: "WTF with Nikhil Kamath - Episode 5: Indian Real Estate & Urban Planning",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A009",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A010",
    uncut_duration_sec: 5000.0,
    published_duration_sec: 4720.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 80.0, pub_start_sec: 0.0, pub_end_sec: 0.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 80.0, uncut_end_sec: 1400.0, pub_start_sec: 0.0, pub_end_sec: 1320.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 1400.0, uncut_end_sec: 1400.0, pub_start_sec: 1320.0, pub_end_sec: 1380.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 1400.0, uncut_end_sec: 2600.0, pub_start_sec: 1380.0, pub_end_sec: 2580.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 2600.0, uncut_end_sec: 2750.0, pub_start_sec: 2580.0, pub_end_sec: 2580.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 2750.0, uncut_end_sec: 3900.0, pub_start_sec: 2580.0, pub_end_sec: 3730.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 6, uncut_start_sec: 3900.0, uncut_end_sec: 3900.0, pub_start_sec: 3730.0, pub_end_sec: 3790.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 7, uncut_start_sec: 3900.0, uncut_end_sec: 4070.0, pub_start_sec: 3790.0, pub_end_sec: 3790.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 8, uncut_start_sec: 4070.0, uncut_end_sec: 5000.0, pub_start_sec: 3790.0, pub_end_sec: 4720.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W6",
    slug: "wtf-nikhil-kamath-ep-06-gaming-esports",
    title: "WTF with Nikhil Kamath - Episode 6: The Gaming & Esports Boom",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A011",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A012",
    uncut_duration_sec: 6600.0,
    published_duration_sec: 5745.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 0.0, pub_start_sec: 0.0, pub_end_sec: 45.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 0.0, uncut_end_sec: 2400.0, pub_start_sec: 45.0, pub_end_sec: 2445.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 2400.0, uncut_end_sec: 3300.0, pub_start_sec: 2445.0, pub_end_sec: 2445.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 3300.0, uncut_end_sec: 6600.0, pub_start_sec: 2445.0, pub_end_sec: 5745.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W7",
    slug: "wtf-nikhil-kamath-ep-07-education-edtech",
    title: "WTF with Nikhil Kamath - Episode 7: Education, EdTech & Skill Building",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A013",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A014",
    uncut_duration_sec: 5800.0,
    published_duration_sec: 5670.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 100.0, pub_start_sec: 0.0, pub_end_sec: 0.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 100.0, uncut_end_sec: 2100.0, pub_start_sec: 0.0, pub_end_sec: 2000.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 2100.0, uncut_end_sec: 2100.0, pub_start_sec: 2000.0, pub_end_sec: 2060.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 2100.0, uncut_end_sec: 3800.0, pub_start_sec: 2060.0, pub_end_sec: 3760.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 3800.0, uncut_end_sec: 3950.0, pub_start_sec: 3760.0, pub_end_sec: 3760.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 3950.0, uncut_end_sec: 3950.0, pub_start_sec: 3760.0, pub_end_sec: 3820.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 6, uncut_start_sec: 3950.0, uncut_end_sec: 5800.0, pub_start_sec: 3820.0, pub_end_sec: 5670.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W8",
    slug: "wtf-nikhil-kamath-ep-08-venture-capital",
    title: "WTF with Nikhil Kamath - Episode 8: Venture Capital, Angel Investing & Valuations",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A015",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A016",
    uncut_duration_sec: 8400.0,
    published_duration_sec: 7320.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 2000.0, pub_start_sec: 0.0, pub_end_sec: 2000.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 2000.0, uncut_end_sec: 2300.0, pub_start_sec: 2000.0, pub_end_sec: 2000.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 2300.0, uncut_end_sec: 2300.0, pub_start_sec: 2000.0, pub_end_sec: 2060.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 2300.0, uncut_end_sec: 4500.0, pub_start_sec: 2060.0, pub_end_sec: 4260.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 4500.0, uncut_end_sec: 4900.0, pub_start_sec: 4260.0, pub_end_sec: 4260.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 4900.0, uncut_end_sec: 4900.0, pub_start_sec: 4260.0, pub_end_sec: 4320.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 6, uncut_start_sec: 4900.0, uncut_end_sec: 6800.0, pub_start_sec: 4320.0, pub_end_sec: 6220.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 7, uncut_start_sec: 6800.0, uncut_end_sec: 7300.0, pub_start_sec: 6220.0, pub_end_sec: 6220.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 8, uncut_start_sec: 7300.0, uncut_end_sec: 8400.0, pub_start_sec: 6220.0, pub_end_sec: 7320.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W9",
    slug: "wtf-nikhil-kamath-ep-09-space-tech",
    title: "WTF with Nikhil Kamath - Episode 9: Space Tech, ISRO & Private Launch",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A017",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A018",
    uncut_duration_sec: 5200.0,
    published_duration_sec: 4695.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 0.0, pub_start_sec: 0.0, pub_end_sec: 45.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 0.0, uncut_end_sec: 1600.0, pub_start_sec: 45.0, pub_end_sec: 1645.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 1600.0, uncut_end_sec: 1850.0, pub_start_sec: 1645.0, pub_end_sec: 1645.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 1850.0, uncut_end_sec: 3500.0, pub_start_sec: 1645.0, pub_end_sec: 3295.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 3500.0, uncut_end_sec: 3800.0, pub_start_sec: 3295.0, pub_end_sec: 3295.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 3800.0, uncut_end_sec: 5200.0, pub_start_sec: 3295.0, pub_end_sec: 4695.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
  {
    episode_id: "ep_01J6G7M8N9P0Q1R2S3T4U5V6W0",
    slug: "wtf-nikhil-kamath-ep-10-creators-media",
    title: "WTF with Nikhil Kamath - Episode 10: The Creators, Media & Entertainment Special",
    show_title: "WTF with Nikhil Kamath",
    ip: "WTF",
    uncut_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A019",
    published_asset_id: "ast_01J6G7M8N9P0Q1R2S3T4U5A020",
    uncut_duration_sec: 7800.0,
    published_duration_sec: 6860.0,
    intervals: [
      { interval_index: 0, uncut_start_sec: 0.0, uncut_end_sec: 0.0, pub_start_sec: 0.0, pub_end_sec: 60.0, interval_status: "added_in_published", confidence: 1.0 },
      { interval_index: 1, uncut_start_sec: 0.0, uncut_end_sec: 1500.0, pub_start_sec: 60.0, pub_end_sec: 1560.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 2, uncut_start_sec: 1500.0, uncut_end_sec: 1700.0, pub_start_sec: 1560.0, pub_end_sec: 1560.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 3, uncut_start_sec: 1700.0, uncut_end_sec: 3600.0, pub_start_sec: 1560.0, pub_end_sec: 3460.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 4, uncut_start_sec: 3600.0, uncut_end_sec: 3900.0, pub_start_sec: 3460.0, pub_end_sec: 3460.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 5, uncut_start_sec: 3900.0, uncut_end_sec: 5800.0, pub_start_sec: 3460.0, pub_end_sec: 5360.0, interval_status: "matched", confidence: 1.0 },
      { interval_index: 6, uncut_start_sec: 5800.0, uncut_end_sec: 6300.0, pub_start_sec: 5360.0, pub_end_sec: 5360.0, interval_status: "cut_from_published", confidence: 1.0 },
      { interval_index: 7, uncut_start_sec: 6300.0, uncut_end_sec: 7800.0, pub_start_sec: 5360.0, pub_end_sec: 6860.0, interval_status: "matched", confidence: 1.0 },
    ],
  },
];

function convertTime(intervals, fromSystem, timeSec, uncutMax, pubMax) {
  if (timeSec < 0 || (fromSystem === "uncut" && timeSec > uncutMax) || (fromSystem === "published" && timeSec > pubMax)) {
    return {
      target_time_sec: null,
      status: "unmapped",
      confidence: 0.0,
      reason: "Timestamp falls outside episode duration bounds",
    };
  }

  for (const interval of intervals) {
    if (fromSystem === "uncut") {
      if (timeSec >= interval.uncut_start_sec && timeSec <= interval.uncut_end_sec) {
        if (interval.interval_status === "cut_from_published") {
          return {
            target_time_sec: null,
            status: "cut_from_published",
            confidence: 1.0,
            interval_index: interval.interval_index,
          };
        }
        if (interval.interval_status === "matched") {
          const uncutSpan = interval.uncut_end_sec - interval.uncut_start_sec;
          const pubSpan = interval.pub_end_sec - interval.pub_start_sec;
          const fraction = uncutSpan === 0 ? 0 : (timeSec - interval.uncut_start_sec) / uncutSpan;
          const targetTime = interval.pub_start_sec + fraction * pubSpan;
          return {
            target_time_sec: Math.round(targetTime * 1000) / 1000,
            status: "matched",
            confidence: interval.confidence,
            interval_index: interval.interval_index,
          };
        }
      }
    } else {
      // from published
      if (timeSec >= interval.pub_start_sec && timeSec <= interval.pub_end_sec) {
        if (interval.interval_status === "added_in_published") {
          return {
            target_time_sec: null,
            status: "added_in_published",
            confidence: 1.0,
            interval_index: interval.interval_index,
          };
        }
        if (interval.interval_status === "matched") {
          const pubSpan = interval.pub_end_sec - interval.pub_start_sec;
          const uncutSpan = interval.uncut_end_sec - interval.uncut_start_sec;
          const fraction = pubSpan === 0 ? 0 : (timeSec - interval.pub_start_sec) / pubSpan;
          const targetTime = interval.uncut_start_sec + fraction * uncutSpan;
          return {
            target_time_sec: Math.round(targetTime * 1000) / 1000,
            status: "matched",
            confidence: interval.confidence,
            interval_index: interval.interval_index,
          };
        }
      }
    }
  }

  return {
    target_time_sec: null,
    status: "unmapped",
    confidence: 0.0,
    reason: "Timestamp falls in an unmapped region",
  };
}

const completeEpisodes = episodesData.map((ep) => {
  const evalCoordinates = [];

  // Generate exactly 100 evaluation coordinate pairs per episode:
  // 1. Boundary & out of bounds tests (8 items)
  evalCoordinates.push({
    source_timeline: "uncut",
    time_sec: -10.0,
    expected_target_time_sec: null,
    expected_status: "unmapped",
    description: "Negative uncut timestamp out of bounds",
  });
  evalCoordinates.push({
    source_timeline: "published",
    time_sec: -5.0,
    expected_target_time_sec: null,
    expected_status: "unmapped",
    description: "Negative published timestamp out of bounds",
  });
  evalCoordinates.push({
    source_timeline: "uncut",
    time_sec: ep.uncut_duration_sec + 50.0,
    expected_target_time_sec: null,
    expected_status: "unmapped",
    description: "Uncut timestamp exceeding total duration",
  });
  evalCoordinates.push({
    source_timeline: "published",
    time_sec: ep.published_duration_sec + 30.0,
    expected_target_time_sec: null,
    expected_status: "unmapped",
    description: "Published timestamp exceeding total duration",
  });
  evalCoordinates.push({
    source_timeline: "uncut",
    time_sec: 0.0,
    expected_target_time_sec: convertTime(ep.intervals, "uncut", 0.0, ep.uncut_duration_sec, ep.published_duration_sec).target_time_sec,
    expected_status: convertTime(ep.intervals, "uncut", 0.0, ep.uncut_duration_sec, ep.published_duration_sec).status,
    description: "Exact zero boundary on uncut timeline",
  });
  evalCoordinates.push({
    source_timeline: "published",
    time_sec: 0.0,
    expected_target_time_sec: convertTime(ep.intervals, "published", 0.0, ep.uncut_duration_sec, ep.published_duration_sec).target_time_sec,
    expected_status: convertTime(ep.intervals, "published", 0.0, ep.uncut_duration_sec, ep.published_duration_sec).status,
    description: "Exact zero boundary on published timeline",
  });
  evalCoordinates.push({
    source_timeline: "uncut",
    time_sec: ep.uncut_duration_sec,
    expected_target_time_sec: convertTime(ep.intervals, "uncut", ep.uncut_duration_sec, ep.uncut_duration_sec, ep.published_duration_sec).target_time_sec,
    expected_status: convertTime(ep.intervals, "uncut", ep.uncut_duration_sec, ep.uncut_duration_sec, ep.published_duration_sec).status,
    description: "Exact end boundary on uncut timeline",
  });
  evalCoordinates.push({
    source_timeline: "published",
    time_sec: ep.published_duration_sec,
    expected_target_time_sec: convertTime(ep.intervals, "published", ep.published_duration_sec, ep.uncut_duration_sec, ep.published_duration_sec).target_time_sec,
    expected_status: convertTime(ep.intervals, "published", ep.published_duration_sec, ep.uncut_duration_sec, ep.published_duration_sec).status,
    description: "Exact end boundary on published timeline",
  });

  // 2. Interval edge checks for every interval (both uncut and published edges)
  for (const interval of ep.intervals) {
    if (interval.interval_status === "cut_from_published") {
      const mid = (interval.uncut_start_sec + interval.uncut_end_sec) / 2;
      evalCoordinates.push({
        source_timeline: "uncut",
        time_sec: Math.round(mid * 10) / 10,
        expected_target_time_sec: null,
        expected_status: "cut_from_published",
        description: `Cut section midpoint in interval ${interval.interval_index}`,
      });
    } else if (interval.interval_status === "added_in_published") {
      const mid = (interval.pub_start_sec + interval.pub_end_sec) / 2;
      evalCoordinates.push({
        source_timeline: "published",
        time_sec: Math.round(mid * 10) / 10,
        expected_target_time_sec: null,
        expected_status: "added_in_published",
        description: `Added bumper midpoint in interval ${interval.interval_index}`,
      });
    } else if (interval.interval_status === "matched") {
      // Add start and end points
      const resStart = convertTime(ep.intervals, "uncut", interval.uncut_start_sec, ep.uncut_duration_sec, ep.published_duration_sec);
      evalCoordinates.push({
        source_timeline: "uncut",
        time_sec: interval.uncut_start_sec,
        expected_target_time_sec: resStart.target_time_sec,
        expected_status: resStart.status,
        description: `Matched interval ${interval.interval_index} start edge`,
      });
      const resEnd = convertTime(ep.intervals, "uncut", interval.uncut_end_sec, ep.uncut_duration_sec, ep.published_duration_sec);
      evalCoordinates.push({
        source_timeline: "uncut",
        time_sec: interval.uncut_end_sec,
        expected_target_time_sec: resEnd.target_time_sec,
        expected_status: resEnd.status,
        description: `Matched interval ${interval.interval_index} end edge`,
      });
    }
  }

  // 3. Fill remaining slots up to 100 with systematically distributed test points across intervals
  const matchedIntervals = ep.intervals.filter((i) => i.interval_status === "matched");
  let slotIndex = 0;
  while (evalCoordinates.length < 100) {
    const targetInterval = matchedIntervals[slotIndex % matchedIntervals.length];
    const isUncut = slotIndex % 2 === 0;
    const progress = ((slotIndex * 7 + 13) % 97) / 100; // deterministic pseudo-random spread in (0, 1)

    if (isUncut) {
      const t = targetInterval.uncut_start_sec + progress * (targetInterval.uncut_end_sec - targetInterval.uncut_start_sec);
      const roundedT = Math.round(t * 100) / 100;
      const res = convertTime(ep.intervals, "uncut", roundedT, ep.uncut_duration_sec, ep.published_duration_sec);
      evalCoordinates.push({
        source_timeline: "uncut",
        time_sec: roundedT,
        expected_target_time_sec: res.target_time_sec,
        expected_status: res.status,
        description: `Sample point ${evalCoordinates.length + 1} uncut -> published in interval ${targetInterval.interval_index}`,
      });
    } else {
      const t = targetInterval.pub_start_sec + progress * (targetInterval.pub_end_sec - targetInterval.pub_start_sec);
      const roundedT = Math.round(t * 100) / 100;
      const res = convertTime(ep.intervals, "published", roundedT, ep.uncut_duration_sec, ep.published_duration_sec);
      evalCoordinates.push({
        source_timeline: "published",
        time_sec: roundedT,
        expected_target_time_sec: res.target_time_sec,
        expected_status: res.status,
        description: `Sample point ${evalCoordinates.length + 1} published -> uncut in interval ${targetInterval.interval_index}`,
      });
    }
    slotIndex++;
  }

  return {
    ...ep,
    eval_coordinates: evalCoordinates,
  };
});

const fixtureData = {
  version: "1.0",
  benchmark_name: "10 Golden Episode Alignment Evaluation Benchmark",
  description: "Piecewise linear timeline intervals and 1,000 evaluation coordinate pairs testing matched, cut, added, boundary, and out-of-bounds conversions.",
  total_episodes: completeEpisodes.length,
  total_eval_coordinates: completeEpisodes.reduce((acc, ep) => acc + ep.eval_coordinates.length, 0),
  episodes: completeEpisodes,
};

const outputPath = join(process.cwd(), "cloudflare/test/fixtures/alignment-eval-10-episodes.json");
writeFileSync(outputPath, JSON.stringify(fixtureData, null, 2));
console.log(`Generated ${outputPath} with ${fixtureData.total_episodes} episodes and ${fixtureData.total_eval_coordinates} evaluation coordinate pairs.`);
