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
    created: { type: Date, required: true, default: Date.now },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    last_updated: { type: Date, required: true, default: Date.now },
    last_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
StudentSchema.plugin(require('../../lib/protector'));
// Export the Mongoose model
var Student = mongoose.model('Student', StudentSchema);
Student.setRules([
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