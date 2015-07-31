/**
 * Created by zaenal on 20/05/15.
 * Last updated by abegodong on 02/06/15.
 *
 * Student keeps the record of a student unique to the CBO.
 * If there is a unique student participate in more than one CBO, then they will have one entry for each CBO the student participated.
 * A student in a CBO can be accessed by Super Admin, OR by users that have the student in their permission list.
 *
 * Roles:
 * admin: have access to all students in a CBO
 * case-worker: some case workers only have access to the students in their permission list, some other have access to all students.
 */
// Load required packages
var mongoose = require('mongoose');
var moment = require('moment');
var StudentProgram = require('./schema/StudentProgram');
var Address = require('./schema/Address');

// Define our Student schema
// TODO: On create, the student needs to be added to the list of students on the User Permission of the user who added it.
// TODO: On deletion, need to query all users that have permission to the student and remove those permissions.
// TODO: On read, update, need to ensure the user have permission to the Student.
// TODO: On read, need to pull Student backpack data from HZB/Elasticache for serving.
var StudentSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    first_name: { type: String, component: 'settings' },
    last_name: { type: String, required: true, index: true },
    middle_name: { type: String },
    district_student_id: { type: String },
    addresses: [ Address ],
    school_district: { type: String },
    programs: [ StudentProgram ],
    college_bound: { type: String, index: true, trim: true, enum: [ 'Yes', 'No' ] },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: String,
    emergency1_name: { type: String, trim: true },
    emergency1_relationship: String,
    emergency1_email: { type: String, trim: true },
    emergency1_phone: { type: String, trim: true },
    emergency2_name: { type: String, trim: true },
    emergency2_relationship: String,
    emergency2_email: { type: String, trim: true },
    emergency2_phone: { type: String, trim: true },
    mentor1_name: { type: String, trim: true },
    mentor2_name: { type: String, trim: true },
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});


/**
 *
 * @param values
 * @param exclude
 * @returns {{}}
 */
StudentSchema.statics.crit = function(values, exclude){
    exclude = exclude || [];
    var criteria = {};
    /**
     * Find match
     */
    [
        '_id', 'first_name', 'middle_name', 'last_name', 'organization',
        'district_student_id', 'school_district', 'middle_name'
    ].forEach(function(iterator){

        if(iterator in values && exclude.indexOf(iterator) === -1){

            if(iterator === 'first_name' || iterator === 'middle_name' || iterator === 'last_name') {

                values[iterator] = new RegExp(values[iterator], 'i');

            }

            criteria[iterator] = values[iterator];

        }
    });



    /**
     * Find Match Element
     */
    var isStartDate = false, isEndDate = false;

    ['cohort', 'active', 'participation_start_date', 'participation_end_date'].forEach(function(iterator){

        if(iterator in values && exclude.indexOf(iterator) === -1){

            switch (iterator){

                case 'participation_end_date':

                    criteria.programs.$elemMatch.participation_end_date = moment(values[iterator]).toDate();
                    isEndDate = true;
                    break;

                case 'participation_start_date':

                    criteria.programs.$elemMatch.participation_start_date = moment(values[iterator]).toDate();
                    isStartDate = true;
                    break;

                case 'cohort':

                    criteria.programs.$elemMatch.cohort = { $in: values[iterator] };
                    break;

                case 'active':

                    criteria.programs.$elemMatch.active = values[iterator] ? true : false;
                    break;

                default :

                    criteria[iterator] = { $in : values[iterator] };
                    break;
            }

        }

    });

    if(isStartDate && isEndDate){

        criteria.programs.$elemMatch.participation_start_date = { $gte : criteria.programs.$elemMatch.participation_start_date };

        criteria.programs.$elemMatch.participation_end_date = { $lte : criteria.programs.$elemMatch.participation_end_date };

    }

    return criteria;

};

StudentSchema.plugin(require('../../lib/protector'));
// Export the Mongoose model
var Student = mongoose.model('Student', StudentSchema);


Student.setRules([
    {
        role: {
            name: 'superadmin',
            allow: {
                "*": "*"
            }
        }
    },
    {
        role: {
            name: 'admin',
            allow: {
                "*": "*"
            }
        }
    },
    {
        role: {
            name: 'case-worker',
            allow: {

                create: {
                    properties: {
                        '*': '*' // allows all fields to be visible
                    },
                    where: {
                        //creator: "$dynamic._id"
                    }

                },

                read: {
                    properties: {
                        '*': '*' // allows all fields to be visible
                    },
                    where: {
                        //creator: "$dynamic._id"
                    }

                },
                update: {
                    properties: {
                        '*': '*' // allows all fields to be visible
                    },
                    where: {
                        //creator: "$dynamic._id"
                    }

                },
                delete: {
                    properties: {
                        '*': '*' // allows all fields to be visible
                    },
                    where: {
                        //creator: "$dynamic._id"
                    }

                }
            }

        }

    }

]);
module.exports = Student;