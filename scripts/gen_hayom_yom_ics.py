#!/usr/bin/env python3
"""
Generate complete Hayom Yom ICS file from scraped Chabad.org data.
Covers the full Hebrew year cycle: 19 Kislev 5786 → 18 Kislev 5787.
Adar II entries → 5786 (regular Adar in non-leap year, Feb/Mar 2026)
Adar I entries  → 5787 (leap year Adar I, Feb/Mar 2027)
"""
from datetime import date, timedelta
from convertdate import hebrew

BASE = "https://www.chabad.org"

# Format: (aid, slug, display_title)
# Month name keyword is parsed from slug to determine Hebrew date
RAW_ENTRIES = [
    # === KISLEV 5786 (19–29 Kislev) ===
    ("3314965", "19-Kislev", "19 Kislev"),
    ("3314989", "20-Kislev", "20 Kislev"),
    ("3315235", "21-Kislev", "21 Kislev"),
    ("3315237", "22-Kislev", "22 Kislev"),
    ("3315238", "23-Kislev", "23 Kislev"),
    ("3315240", "24-Kislev", "24 Kislev, The day preceding Chanukah"),
    ("3315244", "25-Kislev", "25 Kislev, Day 1 of Chanukah"),
    ("3315246", "26-Kislev", "26 Kislev, Day 2 of Chanukah"),
    ("3315247", "27-Kislev", "27 Kislev, Day 3 of Chanukah"),
    ("3315249", "28-Kislev", "28 Kislev, Day 4 of Chanukah"),
    ("3315254", "29-Kislev", "29 Kislev, Day 5 of Chanukah"),
    # === TEVET 5786 ===
    ("3315263", "1-Tevet-Rosh-Chodesh-Day-6-of-Chanukah", "1 Tevet, Rosh Chodesh, Day 6 of Chanukah"),
    ("3315269", "2-Tevet-Day-7-of-Chanukah", "2 Tevet, Day 7 of Chanukah"),
    ("3315276", "3-Tevet-Day-8-of-Chanukah", "3 Tevet, Day 8 of Chanukah"),
    ("3315280", "4-Tevet", "4 Tevet"),
    ("3315282", "5-Tevet", "5 Tevet"),
    ("3315285", "6-Tevet", "6 Tevet"),
    ("3315290", "7-Tevet", "7 Tevet"),
    ("3315291", "8-Tevet", "8 Tevet"),
    ("3315295", "9-Tevet", "9 Tevet"),
    ("3315297", "10-Tevet", "10 Tevet"),
    ("3315302", "11-Tevet", "11 Tevet"),
    ("3315303", "12-Tevet", "12 Tevet"),
    ("3315306", "13-Tevet", "13 Tevet"),
    ("3315308", "14-Tevet", "14 Tevet"),
    ("3315311", "15-Tevet", "15 Tevet"),
    ("3315313", "16-Tevet", "16 Tevet"),
    ("3315315", "17-Tevet", "17 Tevet"),
    ("3315317", "18-Tevet", "18 Tevet"),
    ("3315321", "19-Tevet", "19 Tevet"),
    ("3315324", "20-Tevet", "20 Tevet"),
    ("3315329", "21-Tevet", "21 Tevet"),
    ("3315331", "22-Tevet", "22 Tevet"),
    ("3315335", "23-Tevet", "23 Tevet"),
    ("3315339", "24-Tevet", "24 Tevet"),
    ("3315342", "25-Tevet", "25 Tevet"),
    ("3315344", "26-Tevet", "26 Tevet"),
    ("3315348", "27-Tevet", "27 Tevet"),
    ("3315350", "28-Tevet", "28 Tevet"),
    ("3315357", "29-Tevet", "29 Tevet"),
    # === SHVAT 5786 ===
    ("3315359", "1-Shvat-Rosh-Chodesh", "1 Shvat, Rosh Chodesh"),
    ("3315360", "2-Shvat", "2 Shvat"),
    ("3315366", "3-Shvat", "3 Shvat"),
    ("3315368", "4-Shvat", "4 Shvat"),
    ("3315370", "5-Shvat", "5 Shvat"),
    ("3315374", "6-Shvat", "6 Shvat"),
    ("3315378", "7-Shvat", "7 Shvat"),
    ("3315381", "8-Shvat", "8 Shvat"),
    ("3315384", "9-Shvat", "9 Shvat"),
    ("3315386", "10-Shvat", "10 Shvat"),
    ("3315388", "11-Shvat", "11 Shvat"),
    ("3315391", "12-Shvat", "12 Shvat"),
    ("3315394", "13-Shvat", "13 Shvat"),
    ("3315396", "14-Shvat", "14 Shvat"),
    ("3315399", "15-Shvat-Chamishah-Asar-BiShvat", "15 Shvat, Chamishah-Asar BiShvat"),
    ("3315400", "16-Shvat", "16 Shvat"),
    ("3315402", "17-Shvat", "17 Shvat"),
    ("3315404", "18-Shvat", "18 Shvat"),
    ("3315405", "19-Shvat", "19 Shvat"),
    ("3315406", "20-Shvat", "20 Shvat"),
    ("3315408", "21-Shvat", "21 Shvat"),
    ("3315409", "22-Shvat", "22 Shvat"),
    ("3315411", "23-Shvat", "23 Shvat"),
    ("3315412", "24-Shvat", "24 Shvat"),
    ("3315415", "25-Shvat", "25 Shvat"),
    ("3315417", "26-Shvat", "26 Shvat"),
    ("3315418", "27-Shvat", "27 Shvat"),
    ("3315421", "28-Shvat", "28 Shvat"),
    ("3315423", "29-Shvat", "29 Shvat"),
    ("3315427", "30-Shvat-The-1st-day-of-Rosh-Chodesh-Adar-I", "30 Shvat, The 1st day of Rosh Chodesh Adar"),
    # === ADAR II / ADAR 5786 (regular Adar in non-leap year) ===
    ("3315978", "1-Adar-II-The-2nd-day-of-Rosh-Chodesh", "1 Adar, The 2nd day of Rosh Chodesh"),
    ("3315985", "2-Adar-II", "2 Adar"),
    ("3315989", "3-Adar-II", "3 Adar"),
    ("3315990", "4-Adar-II", "4 Adar"),
    ("3315991", "5-Adar-II", "5 Adar"),
    ("3315992", "6-Adar-II", "6 Adar"),
    ("3315997", "7-Adar-II", "7 Adar"),
    ("3315998", "8-Adar-II", "8 Adar"),
    ("3316003", "9-Adar-II", "9 Adar"),
    ("3316004", "10-Adar-II", "10 Adar"),
    ("3316005", "11-Adar-II", "11 Adar"),
    ("3316009", "12-Adar-II", "12 Adar"),
    ("3316015", "13-Adar-II", "13 Adar"),
    ("3316022", "14-Adar-II-Purim", "14 Adar, Purim"),
    ("3316031", "15-Adar-II-Shushan-Purim", "15 Adar, Shushan Purim"),
    ("3316033", "16-Adar-II", "16 Adar"),
    ("3316038", "17-Adar-II", "17 Adar"),
    ("3316041", "18-Adar-II", "18 Adar"),
    ("3316042", "19-Adar-II", "19 Adar"),
    ("3316044", "20-Adar-II", "20 Adar"),
    ("3316046", "21-Adar-II", "21 Adar"),
    ("3316047", "22-Adar-II", "22 Adar"),
    ("3316051", "23-Adar-II", "23 Adar"),
    ("3316055", "24-Adar-II", "24 Adar"),
    ("3316057", "25-Adar-II", "25 Adar"),
    ("3316058", "26-Adar-II", "26 Adar"),
    ("3316067", "27-Adar-II", "27 Adar"),
    ("3316078", "28-Adar-II", "28 Adar"),
    ("3316081", "29-Adar-II", "29 Adar"),
    # === NISSAN 5786 ===
    ("3316084", "1-Nissan-Rosh-Chodesh", "1 Nissan, Rosh Chodesh"),
    ("3316090", "2-Nissan", "2 Nissan"),
    ("3316096", "3-Nissan", "3 Nissan"),
    ("3316108", "4-Nissan", "4 Nissan"),
    ("3316111", "5-Nissan", "5 Nissan"),
    ("3316112", "6-Nissan", "6 Nissan"),
    ("3316115", "7-Nissan", "7 Nissan"),
    ("3316117", "8-Nissan", "8 Nissan"),
    ("3316119", "9-Nissan", "9 Nissan"),
    ("3316122", "10-Nissan", "10 Nissan"),
    ("3316124", "11-Nissan", "11 Nissan"),
    ("3316127", "12-Nissan", "12 Nissan"),
    ("3316129", "13-Nissan", "13 Nissan"),
    ("3316130", "14-Nissan-The-Day-Preceding-Pesach", "14 Nissan, The Day Preceding Pesach"),
    ("3316135", "15-Nissan", "15 Nissan"),
    ("3316138", "16-Nissan", "16 Nissan"),
    ("3316139", "17-Nissan", "17 Nissan"),
    ("3316144", "18-Nissan", "18 Nissan"),
    ("3316149", "19-Nissan", "19 Nissan"),
    ("3316155", "20-Nissan", "20 Nissan"),
    ("3316161", "21-Nissan", "21 Nissan"),
    ("3316167", "22-Nissan", "22 Nissan"),
    ("3316174", "23-Nissan", "23 Nissan"),
    ("3316183", "24-Nissan", "24 Nissan"),
    ("3316193", "25-Nissan", "25 Nissan"),
    ("3316201", "26-Nissan", "26 Nissan"),
    ("3316206", "27-Nissan", "27 Nissan"),
    ("3316212", "28-Nissan", "28 Nissan"),
    ("3316223", "29-Nissan", "29 Nissan"),
    ("3316234", "30-Nissan-The-1st-day-of-Rosh-Chodesh-Iyar", "30 Nissan, The 1st day of Rosh Chodesh Iyar"),
    # === IYAR 5786 ===
    ("3316245", "1-Iyar", "1 Iyar"),
    ("3316253", "2-Iyar", "2 Iyar"),
    ("3316258", "3-Iyar", "3 Iyar"),
    ("3316265", "4-Iyar", "4 Iyar"),
    ("3316270", "5-Iyar", "5 Iyar"),
    ("3316277", "6-Iyar", "6 Iyar"),
    ("3316283", "7-Iyar", "7 Iyar"),
    ("3316286", "8-Iyar", "8 Iyar"),
    ("3316293", "9-Iyar", "9 Iyar"),
    ("3316296", "10-Iyar", "10 Iyar"),
    ("3316299", "11-Iyar", "11 Iyar"),
    ("3316301", "12-Iyar", "12 Iyar"),
    ("3316302", "13-Iyar", "13 Iyar"),
    ("3316303", "14-Iyar-Pesach-Sheni", "14 Iyar, Pesach Sheni"),
    ("3316304", "15-Iyar", "15 Iyar"),
    ("3316305", "16-Iyar", "16 Iyar"),
    ("3316308", "17-Iyar", "17 Iyar"),
    ("3316309", "18-Iyar-Lag-BaOmer", "18 Iyar, Lag BaOmer"),
    ("3316312", "19-Iyar", "19 Iyar"),
    ("3316317", "20-Iyar", "20 Iyar"),
    ("3316318", "21-Iyar", "21 Iyar"),
    ("3316319", "22-Iyar", "22 Iyar"),
    ("3316320", "23-Iyar", "23 Iyar"),
    ("3316321", "24-Iyar", "24 Iyar"),
    ("3316324", "25-Iyar", "25 Iyar"),
    ("3316327", "26-Iyar", "26 Iyar"),
    ("3316333", "27-Iyar", "27 Iyar"),
    ("3316336", "28-Iyar", "28 Iyar"),
    ("3316344", "29-Iyar", "29 Iyar"),
    # === SIVAN 5786 ===
    ("3316506", "1-Sivan-Rosh-Chodesh", "1 Sivan, Rosh Chodesh"),
    ("3316511", "2-Sivan", "2 Sivan"),
    ("3316517", "3-Sivan", "3 Sivan"),
    ("3316521", "4-Sivan", "4 Sivan"),
    ("3316523", "5-Sivan-The-Day-Preceding-Shavuos", "5 Sivan, The Day Preceding Shavuos"),
    ("3316524", "6-Sivan-The-1st-day-of-Shavuos", "6 Sivan, The 1st day of Shavuos"),
    ("3316527", "7-Sivan-The-2nd-day-of-Shavuos", "7 Sivan, The 2nd day of Shavuos"),
    ("3316529", "8-Sivan-Isru-Chag-Shavuos", "8 Sivan, Isru Chag Shavuos"),
    ("3316534", "9-Sivan", "9 Sivan"),
    ("3316536", "10-Sivan", "10 Sivan"),
    ("3316539", "11-Sivan", "11 Sivan"),
    ("3316542", "12-Sivan", "12 Sivan"),
    ("3316543", "13-Sivan", "13 Sivan"),
    ("3316545", "14-Sivan", "14 Sivan"),
    ("3316548", "15-Sivan", "15 Sivan"),
    ("3316553", "16-Sivan", "16 Sivan"),
    ("3316555", "17-Sivan", "17 Sivan"),
    ("3316557", "18-Sivan", "18 Sivan"),
    ("3316562", "19-Sivan", "19 Sivan"),
    ("3316567", "20-Sivan", "20 Sivan"),
    ("3316570", "21-Sivan", "21 Sivan"),
    ("3316571", "22-Sivan", "22 Sivan"),
    ("3316580", "23-Sivan", "23 Sivan"),
    ("3316581", "24-Sivan", "24 Sivan"),
    ("3316585", "25-Sivan", "25 Sivan"),
    ("3316589", "26-Sivan", "26 Sivan"),
    ("3316596", "27-Sivan", "27 Sivan"),
    ("3316603", "28-Sivan", "28 Sivan"),
    ("3316604", "29-Sivan", "29 Sivan"),
    ("3316608", "30-Sivan-the-1st-day-of-Rosh-Chodesh-Tammuz", "30 Sivan, The 1st day of Rosh Chodesh Tammuz"),
    # === TAMMUZ 5786 ===
    ("3316610", "1-Tammuz-The-2nd-day-of-Rosh-Chodesh", "1 Tammuz, The 2nd day of Rosh Chodesh"),
    ("3316611", "2-Tammuz", "2 Tammuz"),
    ("3316613", "3-Tammuz", "3 Tammuz"),
    ("3316616", "4-Tammuz", "4 Tammuz"),
    ("3316619", "5-Tammuz", "5 Tammuz"),
    ("3316622", "6-Tammuz", "6 Tammuz"),
    ("3316627", "7-Tammuz", "7 Tammuz"),
    ("3316630", "8-Tammuz", "8 Tammuz"),
    ("3316633", "9-Tammuz", "9 Tammuz"),
    ("3316640", "10-Tammuz", "10 Tammuz"),
    ("3316648", "11-Tammuz", "11 Tammuz"),
    ("3316657", "12-Tammuz", "12 Tammuz"),
    ("3316664", "13-Tammuz", "13 Tammuz"),
    ("3316666", "14-Tammuz", "14 Tammuz"),
    ("3316676", "15-Tammuz", "15 Tammuz"),
    ("3316679", "16-Tammuz", "16 Tammuz"),
    ("3316684", "17-Tammuz-Shivah-Asar-BeTammuz", "17 Tammuz, Shivah-Asar BeTammuz"),
    ("3316690", "18-Tammuz", "18 Tammuz"),
    ("3316694", "19-Tammuz", "19 Tammuz"),
    ("3316701", "20-Tammuz", "20 Tammuz"),
    ("3316710", "21-Tammuz", "21 Tammuz"),
    ("3316719", "22-Tammuz", "22 Tammuz"),
    ("3316725", "23-Tammuz", "23 Tammuz"),
    ("3316731", "24-Tammuz", "24 Tammuz"),
    ("3316736", "25-Tammuz", "25 Tammuz"),
    ("3316744", "26-Tammuz", "26 Tammuz"),
    ("3316746", "27-Tammuz", "27 Tammuz"),
    ("3316748", "28-Tammuz", "28 Tammuz"),
    ("3316749", "29-Tammuz", "29 Tammuz"),
    # === AV 5786 ===
    ("3316790", "1-Menachem-Av-Rosh-Chodesh", "1 Menachem Av, Rosh Chodesh"),
    ("3316793", "2-Menachem-Av", "2 Menachem Av"),
    ("3316794", "3-Menachem-Av", "3 Menachem Av"),
    ("3316797", "4-Menachem-Av", "4 Menachem Av"),
    ("3316798", "5-Menachem-Av", "5 Menachem Av"),
    ("3316800", "6-Menachem-Av", "6 Menachem Av"),
    ("3316802", "7-Menachem-Av", "7 Menachem Av"),
    ("3316806", "8-Menachem-Av", "8 Menachem Av"),
    ("3316814", "9-Menachem-Av-Tishah-BeAv", "9 Menachem Av, Tishah BeAv"),
    ("3316815", "10-Menachem-Av", "10 Menachem Av"),
    ("3316816", "11-Menachem-Av", "11 Menachem Av"),
    ("3316820", "12-Menachem-Av", "12 Menachem Av"),
    ("3316825", "13-Menachem-Av", "13 Menachem Av"),
    ("3316828", "14-Menachem-Av", "14 Menachem Av"),
    ("3316830", "15-Menachem-Av-Chamishah-Asar-BeAv", "15 Menachem Av, Chamishah-Asar BeAv"),
    ("3316831", "16-Menachem-Av", "16 Menachem Av"),
    ("3316832", "17-Menachem-Av", "17 Menachem Av"),
    ("3316835", "18-Menachem-Av", "18 Menachem Av"),
    ("3316836", "19-Menachem-Av", "19 Menachem Av"),
    ("3316840", "20-Menachem-Av", "20 Menachem Av"),
    ("3316843", "21-Menachem-Av", "21 Menachem Av"),
    ("3316846", "22-Menachem-Av", "22 Menachem Av"),
    ("3316847", "23-Menachem-Av", "23 Menachem Av"),
    ("3316850", "24-Menachem-Av", "24 Menachem Av"),
    ("3316852", "25-Menachem-Av", "25 Menachem Av"),
    ("3316854", "26-Menachem-Av", "26 Menachem Av"),
    ("3316856", "27-Menachem-Av", "27 Menachem Av"),
    ("3316858", "28-Menachem-Av", "28 Menachem Av"),
    ("3316863", "29-Menachem-Av", "29 Menachem Av"),
    ("3316866", "30-Menachem-Av-The-1st-day-of-Rosh-Chodesh-Elul", "30 Menachem Av, The 1st day of Rosh Chodesh Elul"),
    # === ELUL 5786 ===
    ("3316868", "1-Elul-The-2nd-day-of-Rosh-Chodesh", "1 Elul, The 2nd day of Rosh Chodesh"),
    ("3316876", "2-Elul", "2 Elul"),
    ("3316880", "3-Elul", "3 Elul"),
    ("3316881", "4-Elul", "4 Elul"),
    ("3316882", "5-Elul", "5 Elul"),
    ("3316883", "6-Elul", "6 Elul"),
    ("3316884", "7-Elul", "7 Elul"),
    ("3316885", "8-Elul", "8 Elul"),
    ("3316886", "9-Elul", "9 Elul"),
    ("3316888", "10-Elul", "10 Elul"),
    ("3317418", "11-Elul", "11 Elul"),
    ("3317420", "12-Elul", "12 Elul"),
    ("3317422", "13-Elul", "13 Elul"),
    ("3317425", "14-Elul", "14 Elul"),
    ("3317433", "15-Elul", "15 Elul"),
    ("3317450", "16-Elul", "16 Elul"),
    ("3317456", "17-Elul", "17 Elul"),
    ("3317459", "18-Elul-Chai-Elul", "18 Elul, Chai Elul"),
    ("3317461", "19-Elul", "19 Elul"),
    ("3317464", "20-Elul", "20 Elul"),
    ("3317468", "21-Elul", "21 Elul"),
    ("3317469", "22-Elul", "22 Elul"),
    ("3317470", "23-Elul", "23 Elul"),
    ("3317475", "24-Elul", "24 Elul"),
    ("3317477", "25-Elul", "25 Elul"),
    ("3317480", "26-Elul", "26 Elul"),
    ("3317482", "27-Elul", "27 Elul"),
    ("3317483", "28-Elul", "28 Elul"),
    ("3317484", "29-Elul-the-eve-of-Rosh-HaShanah", "29 Elul, the eve of Rosh HaShanah"),
    # === TISHREI 5787 ===
    ("3317490", "1-Tishrei-the-1st-day-of-Rosh-HaShanah", "1 Tishrei, the 1st day of Rosh HaShanah"),
    ("3317495", "2-Tishrei-the-2nd-day-of-Rosh-HaShanah", "2 Tishrei, the 2nd day of Rosh HaShanah"),
    ("3317501", "3-Tishrei", "3 Tishrei"),
    ("3317505", "4-Tishrei", "4 Tishrei"),
    ("3317508", "5-Tishrei", "5 Tishrei"),
    ("3317509", "6-Tishrei", "6 Tishrei"),
    ("3317511", "7-Tishrei", "7 Tishrei"),
    ("3317514", "8-Tishrei", "8 Tishrei"),
    ("3317517", "9-Tishrei", "9 Tishrei"),
    ("3317520", "10-Tishrei-Yom-Kippur", "10 Tishrei, Yom Kippur"),
    ("3317534", "11-Tishrei", "11 Tishrei"),
    ("3317536", "12-Tishrei", "12 Tishrei"),
    ("3317538", "13-Tishrei-Yud-Gimmel-Tishrei", "13 Tishrei, Yud-Gimmel Tishrei"),
    ("3317548", "14-Tishrei-The-Day-Preceding-Sukkos", "14 Tishrei, The Day Preceding Sukkos"),
    ("3317550", "15-Tishrei-The-1st-day-of-Sukkos", "15 Tishrei, The 1st day of Sukkos"),
    ("3317553", "16-Tishrei-The-2nd-day-of-Sukkos", "16 Tishrei, The 2nd day of Sukkos"),
    ("3317555", "17-Tishrei-the-1st-day-of-Chol-HaMoed-Sukkos", "17 Tishrei, The 1st day of Chol HaMoed Sukkos"),
    ("3317558", "18-Tishrei-The-2nd-day-of-Chol-HaMoed-Sukkos", "18 Tishrei, The 2nd day of Chol HaMoed Sukkos"),
    ("3317563", "19-Tishrei-The-3rd-day-of-Chol-HaMoed-Sukkos", "19 Tishrei, The 3rd day of Chol HaMoed Sukkos"),
    ("3317565", "20-Tishrei-The-4th-day-of-Chol-HaMoed-Sukkos", "20 Tishrei, The 4th day of Chol HaMoed Sukkos"),
    ("3317567", "21-Tishrei-Hoshana-Rabbah", "21 Tishrei, Hoshana Rabbah"),
    ("3317568", "22-Tishrei-Shemini-Atzeres", "22 Tishrei, Shemini Atzeres"),
    ("3317575", "23-Tishrei-Simchas-Torah", "23 Tishrei, Simchas Torah"),
    ("3317577", "24-Tishrei-Isru-Chag", "24 Tishrei, Isru Chag"),
    ("3317898", "25-Tishrei", "25 Tishrei"),
    ("3317902", "26-Tishrei", "26 Tishrei"),
    ("3317904", "27-Tishrei", "27 Tishrei"),
    ("3317907", "28-Tishrei", "28 Tishrei"),
    ("3317909", "29-Tishrei", "29 Tishrei"),
    ("3317912", "30-Tishrei-The-1st-day-of-Rosh-Chodesh-Cheshvan", "30 Tishrei, The 1st day of Rosh Chodesh Cheshvan"),
    # === CHESHVAN 5787 ===
    ("3317918", "1-Cheshvan-the-2nd-day-of-Rosh-Chodesh", "1 Cheshvan, The 2nd day of Rosh Chodesh"),
    ("3317923", "2-Cheshvan", "2 Cheshvan"),
    ("3317928", "3-Cheshvan", "3 Cheshvan"),
    ("3317930", "4-Cheshvan", "4 Cheshvan"),
    ("3317931", "5-Cheshvan", "5 Cheshvan"),
    ("3317965", "6-Cheshvan", "6 Cheshvan"),
    ("3317968", "7-Cheshvan", "7 Cheshvan"),
    ("3317973", "8-Cheshvan", "8 Cheshvan"),
    ("3317978", "9-Cheshvan", "9 Cheshvan"),
    ("3317979", "10-Cheshvan", "10 Cheshvan"),
    ("3317981", "11-Cheshvan", "11 Cheshvan"),
    ("3317982", "12-Cheshvan", "12 Cheshvan"),
    ("3317984", "13-Cheshvan", "13 Cheshvan"),
    ("3317985", "14-Cheshvan", "14 Cheshvan"),
    ("3317988", "15-Cheshvan", "15 Cheshvan"),
    ("3317997", "16-Cheshvan", "16 Cheshvan"),
    ("3318001", "17-Cheshvan", "17 Cheshvan"),
    ("3318006", "18-Cheshvan", "18 Cheshvan"),
    ("3318010", "19-Cheshvan", "19 Cheshvan"),
    ("3318015", "20-Cheshvan-Chaf-Cheshvan", "20 Cheshvan, Chaf Cheshvan"),
    ("3318017", "21-Cheshvan", "21 Cheshvan"),
    ("3318020", "22-Cheshvan", "22 Cheshvan"),
    ("3318030", "23-Cheshvan", "23 Cheshvan"),
    ("3318041", "24-Cheshvan", "24 Cheshvan"),
    ("3318047", "25-Cheshvan", "25 Cheshvan"),
    ("3318056", "26-Cheshvan", "26 Cheshvan"),
    ("3318082", "27-Cheshvan", "27 Cheshvan"),
    ("3318085", "28-Cheshvan", "28 Cheshvan"),
    ("3318090", "29-Cheshvan", "29 Cheshvan"),
    # === KISLEV 5787 (1–18 Kislev, end of cycle) ===
    ("3318094", "1-Kislev-Rosh-Chodesh", "1 Kislev, Rosh Chodesh"),
    ("3318098", "2-Kislev", "2 Kislev"),
    ("3318100", "3-Kislev", "3 Kislev"),
    ("3318101", "4-Kislev", "4 Kislev"),
    ("3318107", "5-Kislev", "5 Kislev"),
    ("3318109", "6-Kislev", "6 Kislev"),
    ("3318111", "7-Kislev", "7 Kislev"),
    ("3318116", "8-Kislev", "8 Kislev"),
    ("3318127", "9-Kislev-Tes-Kislev", "9 Kislev, Tes Kislev"),
    ("3318144", "10-Kislev-Yud-Kislev", "10 Kislev, Yud Kislev"),
    ("3318154", "11-Kislev", "11 Kislev"),
    ("3318157", "12-Kislev", "12 Kislev"),
    ("3318160", "13-Kislev", "13 Kislev"),
    ("3318162", "14-Kislev", "14 Kislev"),
    ("3318170", "15-Kislev", "15 Kislev"),
    ("3318173", "16-Kislev", "16 Kislev"),
    ("3318175", "17-Kislev", "17 Kislev"),
    ("3318178", "18-Kislev", "18 Kislev"),
    # === ADAR I 5787 (leap year only, placed in Feb-Mar 2027) ===
    ("3315436", "1-Adar-I", "1 Adar I, The 2nd day of Rosh Chodesh"),
    ("3315445", "2-Adar-I", "2 Adar I"),
    ("3315447", "3-Adar-I", "3 Adar I"),
    ("3315451", "4-Adar-I", "4 Adar I"),
    ("3315454", "5-Adar-I", "5 Adar I"),
    ("3315456", "6-Adar-I", "6 Adar I"),
    ("3315459", "7-Adar-I", "7 Adar I"),
    ("3315460", "8-Adar-I", "8 Adar I"),
    ("3315463", "9-Adar-I", "9 Adar I"),
    ("3315464", "10-Adar-I", "10 Adar I"),
    ("3315465", "11-Adar-I", "11 Adar I"),
    ("3315468", "12-Adar-I", "12 Adar I"),
    ("3315470", "13-Adar-I", "13 Adar I"),
    ("3315526", "14-Adar-I-Purim-Katan", "14 Adar I, Purim Katan"),
    ("3315928", "15-Adar-I-Shushan-Purim-Katan", "15 Adar I, Shushan Purim Katan"),
    ("3315930", "16-Adar-I", "16 Adar I"),
    ("3315934", "17-Adar-I", "17 Adar I"),
    ("3315936", "18-Adar-I", "18 Adar I"),
    ("3315939", "19-Adar-I", "19 Adar I"),
    ("3315940", "20-Adar-I", "20 Adar I"),
    ("3315942", "21-Adar-I", "21 Adar I"),
    ("3315946", "22-Adar-I", "22 Adar I"),
    ("3315949", "23-Adar-I", "23 Adar I"),
    ("3315950", "24-Adar-I", "24 Adar I"),
    ("3315952", "25-Adar-I", "25 Adar I"),
    ("3315958", "26-Adar-I", "26 Adar I"),
    ("3315960", "27-Adar-I", "27 Adar I"),
    ("3315963", "28-Adar-I", "28 Adar I"),
    ("3315972", "29-Adar-I", "29 Adar I"),
    ("3315973", "30-Adar-I", "30 Adar I"),
]

# Hebrew month → (convertdate month number, Hebrew year)
# convertdate: Nisan=1, Iyar=2, Sivan=3, Tammuz=4, Av=5, Elul=6,
#              Tishrei=7, Cheshvan=8, Kislev=9, Tevet=10, Shvat=11,
#              Adar=12 (non-leap) / Adar I=12 (leap), Adar II=13
MONTH_KEY_MAP = {
    "Kislev-5786": (9, 5786),    # days 19–29
    "Tevet":       (10, 5786),
    "Shvat":       (11, 5786),
    "AdarII":      (12, 5786),   # regular Adar in non-leap year
    "Nissan":      (1, 5786),
    "Iyar":        (2, 5786),
    "Sivan":       (3, 5786),
    "Tammuz":      (4, 5786),
    "Av":          (5, 5786),
    "Elul":        (6, 5786),
    "Tishrei":     (7, 5787),
    "Cheshvan":    (8, 5787),
    "Kislev-5787": (9, 5787),    # days 1–18
    "AdarI":       (12, 5787),   # Adar I in leap year 5787
}


def slug_to_hebrew(slug):
    """Extract day number and month key from slug."""
    import re
    m = re.match(r"^(\d+)-(.+)$", slug)
    if not m:
        return None, None
    day = int(m.group(1))
    rest = m.group(2)

    if rest.startswith("Adar-II"):
        return day, "AdarII"
    if rest.startswith("Adar-I") or rest.startswith("Adar-I-I"):
        return day, "AdarI"
    if rest.startswith("Teves") or rest.startswith("Tevet"):
        return day, "Tevet"
    if rest.startswith("Shvat"):
        return day, "Shvat"
    if rest.startswith("Nissan"):
        return day, "Nissan"
    if rest.startswith("Iyar"):
        return day, "Iyar"
    if rest.startswith("Sivan"):
        return day, "Sivan"
    if rest.startswith("Tammuz"):
        return day, "Tammuz"
    if rest.startswith("Menachem-Av") or rest.startswith("Av"):
        return day, "Av"
    if rest.startswith("Elul"):
        return day, "Elul"
    if rest.startswith("Tishrei"):
        return day, "Tishrei"
    if rest.startswith("Cheshvan"):
        return day, "Cheshvan"
    if rest.startswith("Kislev"):
        # Determine year from day number: 1–18 = 5787, 19–29 = 5786
        return day, ("Kislev-5787" if day <= 18 else "Kislev-5786")
    return day, None


def to_gregorian(month_key, day):
    entry = MONTH_KEY_MAP.get(month_key)
    if not entry:
        return None
    hmonth, hyear = entry
    try:
        g = hebrew.to_gregorian(hyear, hmonth, day)
        return date(*g)
    except Exception as e:
        print(f"  ERROR converting {day} {month_key}: {e}")
        return None


def build_ics():
    from datetime import timedelta

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Hayom Yom//Tackling Life's Tasks//EN",
        "CALSCALE:GREGORIAN",
        "X-WR-CALNAME:Hayom Yom - Tackling Life's Tasks",
        "X-WR-CALDESC:Daily Chassidic teachings - Hayom Yom",
    ]

    def add_event(dtstart_date, summary, url, uid):
        dtstart = dtstart_date.strftime("%Y%m%d")
        dtend = (dtstart_date + timedelta(days=1)).strftime("%Y%m%d")
        summary_esc = summary.replace(",", "\\,")
        lines.extend([
            "BEGIN:VEVENT",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
            f"SUMMARY:{summary_esc}",
            f"URL:{url}",
            f"DESCRIPTION:{url}",
            f"UID:{uid}",
            "END:VEVENT",
        ])

    # Foreword: 18 Kislev 5786 = Dec 8, 2025
    foreword_date = to_gregorian("Kislev-5786", 18)
    add_event(
        foreword_date,
        "Hayom Yom - Foreword",
        f"{BASE}/therebbe/article_cdo/aid/3314964/jewish/Foreword.htm",
        "hayomyom-3314964@chabad.org",
    )

    event_count = 1
    errors = 0
    for aid, slug, title in RAW_ENTRIES:
        day, month_key = slug_to_hebrew(slug)
        if day is None or month_key is None:
            print(f"  WARNING: cannot parse slug '{slug}'")
            errors += 1
            continue

        gdate = to_gregorian(month_key, day)
        if gdate is None:
            errors += 1
            continue

        url = f"{BASE}/therebbe/article_cdo/aid/{aid}/jewish/{slug}.htm"
        add_event(gdate, f"Hayom Yom - {title}", url, f"hayomyom-{aid}@chabad.org")
        event_count += 1

    lines.append("END:VCALENDAR")
    print(f"Total events: {event_count}  (errors: {errors})")
    return "\r\n".join(lines) + "\r\n"


if __name__ == "__main__":
    # Quick sanity check on dates
    print("Date checks:")
    checks = [
        ("Kislev-5786", 19, "2025-12-09"),
        ("Tevet",        1, "2025-12-21"),
        ("Shvat",        1, "2026-01-19"),
        ("AdarII",       1, "2026-02-18"),
        ("Nissan",       1, "2026-03-19"),
        ("Iyar",         1, "2026-04-18"),
        ("Sivan",        1, "2026-05-17"),
        ("Tammuz",       1, "2026-06-16"),
        ("Av",           1, "2026-07-15"),
        ("Elul",         1, "2026-08-14"),
        ("Tishrei",      1, "2026-09-12"),
        ("Cheshvan",     1, "2026-10-12"),
        ("Kislev-5787",  1, "2026-11-11"),
        ("AdarI",        1, "2027-02-08"),
    ]
    all_ok = True
    for mkey, day, expected in checks:
        g = to_gregorian(mkey, day)
        status = "✓" if g and g.isoformat() == expected else "✗"
        if status == "✗":
            all_ok = False
        print(f"  {status} {day} {mkey}: {g} (expected {expected})")

    print()
    ics = build_ics()

    import os
    out_path = "/Applications/apps/matthew-miller-personal-site/public/calendar/hayom_yom.ics"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", newline="") as f:
        f.write(ics)
    print(f"Written to {out_path}")
