package com.config;

import com.model.Destination;
import com.repository.DestinationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Runs once on every application startup.
 * For each destination whose search_keywords column is NULL,
 * populates it with known landmark / attraction aliases.
 *
 * This means team members only need to restart the backend —
 * no manual SQL UPDATE statements needed.
 */

/*
 * Tells Spring:
 * “Create this class as a Bean automatically”
 * 
 * Application Runner: “Run the run() method after the application context is
 * loaded” also it is built in in sprng boot.
 */

@Component
public class DestinationDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DestinationDataInitializer.class); // LoggerFactory:
                                                                                                 // “Create a logger for
                                                                                                 // this class, so we
                                                                                                 // can log info and
                                                                                                 // debug messages”

    private final DestinationRepository destinationRepo;

    // name → keywords (comma-separated landmarks / aliases)
    private static final Map<String, String> KEYWORD_MAP = Map.of(
            "Hunza Valley",
            "Baltit Fort, Altit Fort, Attabad Lake, Eagles Nest, Rakaposhi, Karimabad, " +
                    "cherry blossom, Nagar, Duikar, Ganish, Hunzakuts, Gilgit",

            "Murree",
            "Mall Road, Patriata, New Murree, chairlift, Bhurban, Kashmir Point, " +
                    "Pindi Point, pine forest, Ayubia, Nathiagali",

            "Swat Valley",
            "Mingora, Kalam, Malam Jabba, Butkara Stupa, White Palace, Fizagat Park, " +
                    "Bahrain, Mahodand Lake, Ushu Forest, Marghazar",

            "Skardu",
            "Shangrila Resort, Satpara Lake, K2 base camp, Shigar Fort, Kharphocho Fort, " +
                    "Deosai Plains, Upper Kachura, Concordia, Baltoro Glacier, Cold Desert",

            "Naran Kaghan",
            "Saif ul Malook Lake, Saiful Maluk, Lake Lulusar, Babusar Top, Lalazar, " +
                    "Shogran, Payye Meadows, Ansoo Lake, Batakundi, Mansehra",

            "Lahore",
            "Minar-e-Pakistan, Minare Pakistan, Minar e Pakistan, Badshahi Mosque, " +
                    "Lahore Fort, Shalimar Gardens, Walled City, Anarkali, Data Darbar, " +
                    "Food Street, Wagah Border, Wagah, Jahangir Tomb, Shahi Qila, Noor Jahan, " +
                    "Sunehri Masjid, Liberty Market, Gulberg, Hussain Agahi, Cooco Den, Orange Line",

            "Islamabad",
            "Faisal Mosque, Margalla Hills, Daman-e-Koh, Shakarparian, Pakistan Monument, " +
                    "Lake View Park, Rawal Lake, Centaurus, Trail 3, Trail 5, F-7, F-6, " +
                    "Saidpur Village, Lok Virsa, PIMS, Zero Point, Melody, Kohsar Market",

            "Fairy Meadows",
            "Nanga Parbat, Killer Mountain, Raikot Bridge, Tattu Village, Beyal Camp, " +
                    "Diamir, Rupal Face, basecamp, Nanga Parbat base camp, 9th highest peak",

            "Mohenjo Daro",
            "Indus Valley Civilization, Great Bath, Dancing Girl, Priest King, Larkana, " +
                    "bronze age, Harappan, Mohenjodaro, Moenjodaro, ancient city, 2500 BC, UNESCO",

            "Cholistan Desert",
            "Derawar Fort, Bahawalpur, camel safari, jeep rally, Yazman, Fort Abbas, " +
                    "Dingarh Fort, Marot, Islamgarh, desert camp, Cholistan rally, Abbasi");

    public DestinationDataInitializer(DestinationRepository destinationRepo) {
        this.destinationRepo = destinationRepo;
    }

    // filling the destination table with search keywords for each destination, if
    // not already filled. This allows the search endpoint to match user queries
    // against these keywords and return relevant destinations.
    @Override
    @Transactional
    public void run(ApplicationArguments args) { // @Transactional: “Run this method in a database transaction, so all
                                                 // updates are atomic and consistent”
        int updated = 0;
        for (Destination dest : destinationRepo.findAll()) {
            if (dest.getSearchKeywords() == null || dest.getSearchKeywords().isBlank()) {
                String keywords = KEYWORD_MAP.get(dest.getName());
                if (keywords != null) {
                    dest.setSearchKeywords(keywords);
                    destinationRepo.save(dest);
                    updated++;
                }
            }
        }
        if (updated > 0) {
            log.info("Populated search_keywords for {} destination(s).", updated);
        }
    }
}
