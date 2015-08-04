/**
 * Created by zaenal on 20/05/15.
 */
/**
 * Created by zaenal on 20/05/15.
 */
// Load required packages
var mongoose = require('mongoose');

// Define our Address schema
var AddressSchema = new mongoose.Schema({
    address_type: {type: String, enum: ["Home", "Work", "Mailing"]},
    venue: String, // Optional venue name at the address, useful for names of buildings. (ex: Smith Hall)
    address_line: String,
    city: String,
    state: String,
    zip: String,
    country: String, // The country code according to ISO 3166-1 Alpha-2.
    location: {latitude: Number, longitude: Number, accuracy: {type: String, enum: ["Rooftop", "Approximate"]}} //An object hash representing the geocoded location information for the address.
});

// Export the Mongoose model
module.exports = AddressSchema;