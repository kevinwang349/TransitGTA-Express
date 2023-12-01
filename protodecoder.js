
// Main decoding function, takes in a protobuffer message in the form of an array of hex codes and a predetermined format in the form of a JSON object
function decode(hex = [''], format = {}) {
    let index = 0;
    let JSON = {};
    // Loop through the hex array
    while (index < hex.length) {
        // Get the key, wire type, and field number of each field
        let key = toBinary(hex[index]);
        let wiretype = toInt(key.substring(5));
        let fieldnum = toInt(key.substring(1, 5));
        let name = format[`${fieldnum}`]; // name of the field
        if (name == undefined) name = `${fieldnum}`; // if the name is undefined, set it to the field number
        let data;
        // Wire type 2 = length-delimited, either string or embedded object
        if (wiretype == 2) {
            // Decode the length varint
            let length = 0;
            let i = index + 1;
            let bytes = [];
            let varlength = 1;
            // Loop forwards from the current index
            while (i < hex.length) {
                varlength++;
                const s = hex[i];
                const binarystr = toBinary(s);
                const msb = binarystr.substring(0, 1);
                bytes.push(binarystr.substring(1));
                if (msb == 0) {
                    // end of varint
                    bytes.reverse();
                    let str = bytes.join('');
                    length = toInt(str);
                    break;
                }
                i++;
            }
            // Get the encoded string / embedded message and advance the index
            let newhex = hex.slice(index + varlength, index + length + varlength);
            index = index + length + varlength;
            if (typeof name == 'object') {
                // Decode embedded message by calling this decode function
                data = decode(newhex, name);
                name = name.name;
            } else {
                // Decode utf-8 string
                let str = '';
                for (const h of newhex) {
                    let int = parseInt(parseInt(h, 16).toString(10));
                    str += String.fromCharCode(int);
                }
                data = str;
            }
        }
        // Wire type 0 = varint
        else if (wiretype == 0) {
            let i = index + 1;
            let bytes = [];
            // Loop forwards from the current index
            while (i < hex.length) {
                const s = hex[i];
                const binarystr = toBinary(s);
                const msb = binarystr.substring(0, 1);
                bytes.push(binarystr.substring(1));
                if (msb == 0) {
                    // end of varint
                    bytes.reverse();
                    let str = bytes.join('');
                    data = toInt(str); // Decode the binary number
                    index = i + 1;
                    break;
                }
                i++;
            }
        }
        // Wire type 5 = 32-bit integer or floating point
        else if (wiretype == 5) {
            // Get the four bytes of data
            let newhex = hex.slice(index + 1, index + 5);
            newhex.reverse(); // reverse them because they're stored in little-endian order
            index = index + 5; // advance the index
            // Convert the four hex bytes into a single binary number
            let binarystr = '';
            for (const h of newhex) {
                binarystr += toBinary(h);
            }
            // In GTFS realtime, the only 32-bit fields are floating point numbers
            let float = toFloatBinary(binarystr);
            data = parseFloat(float.toFixed(5));
        }
        // Wire type 1 = 64-bit integer or floating point
        else if (wiretype == 1) {
            // Get the eight bytes of data
            let newhex = hex.slice(index + 1, index + 9);
            newhex.reverse(); // reverse them because they're stored in little-endian order
            index = index + 9; // advance the index
            // Convert the four hex bytes into a single binary number
            let binarystr = '';
            for (const h of newhex) {
                binarystr += toBinary(h);
            }
            // In GTFS realtime, the only 64-bit fields are floating point numbers
            let double = toDoubleBinary(binarystr);
            data = parseFloat(double.toFixed(15));
        }
        // In case something doesn't match, skip this field
        else {
            index++;
        }
        // In case of multiple fields with the same name
        if (JSON[`${name}`] == undefined) {
            // First appearance of this field
            JSON[`${name}`] = data;
        } else if (JSON[`${name}`].length == undefined) { // not undefined and not already an array
            // Field already exists: place both instances of the field into an array
            let oldData = JSON[`${name}`];
            JSON[`${name}`] = [oldData, data];
        } else {
            // Multiple fields already exist: add new field to the existing array
            JSON[`${name}`].push(data);
        }
    }
    // Return the decoded JSON object
    return JSON;
}

// A JSON object for the format of a GTFS-realtime protocol buffer. Basically a .proto file in JSON form.
// Format for embedded messages => <field number>: { name: <field name>, <fields> }
// Format for fields => <field number>: <field name>
const formatGTFS = {
    1: {
        name: 'header',
        1: 'version',
        2: 'incrementality',
        3: 'timestamp'
    },
    2: {
        name: 'entity',
        1: 'id',
        2: 'is_deleted',
        3: {
            name: 'trip_update',
            1: {
                name: 'trip',
                1: 'trip_id',
                2: 'start_time',
                3: 'start_date',
                4: 'schedule_relationship',
                5: 'route_id',
                6: 'direction_id'
            },
            2: {
                name: 'stop_time_update',
                1: 'stop_sequence',
                2: {
                    name: 'arrival',
                    1: 'delay',
                    2: 'time',
                    3: 'uncertainty'
                },
                3: {
                    name: 'departure',
                    1: 'delay',
                    2: 'time',
                    3: 'uncertainty'
                },
                4: 'stop_id',
                5: 'schedule_relationship'
            },
            3: {
                name: 'vehicle',
                1: 'id',
                2: 'label',
                3: 'license_plate'
            },
            4: 'timestamp'
        },
        4: {
            name: 'vehicle',
            1: {
                name: 'trip',
                1: 'trip_id',
                2: 'start_time',
                3: 'start_date',
                4: 'schedule_relationship',
                5: 'route_id',
                6: 'direction_id'
            },
            2: {
                name: 'position',
                1: 'latitude',
                2: 'longitude',
                3: 'bearing',
                4: 'odometer',
                5: 'speed'
            },
            3: 'current_stop_sequence',
            4: 'current_status',
            5: 'timestamp',
            6: 'congestion_level',
            7: 'stop_id',
            8: {
                name: 'vehicle',
                1: 'id',
                2: 'label',
                3: 'license_plate'
            },
            9: 'occupancy_status'
        },
        5: {
            name: 'alert',
            1: {
                name: 'active_period',
                1: 'start_time',
                2: 'end_time'
            },
            5: {
                name: 'informed_entity',
                1: 'trip_id',
                2: 'start_time',
                3: 'start_date',
                5: 'route_id'
            },
            6: 'cause',
            7: 'effect',
            8: {
                name: 'url',
                1: {
                    name: 'translation',
                    1: 'text',
                    2: 'language'
                }
            },
            10: {
                name: 'header_text',
                1: {
                    name: 'translation',
                    1: 'text',
                    2: 'language'
                }
            },
            11: {
                name: 'description_text',
                1: {
                    name: 'translation',
                    1: 'text',
                    2: 'language'
                }
            }
        }
    }
}

export {decode, formatGTFS};

// Extra utility functions:

// Convert a string of hex codes into binary
function toBinary(hex) {
    let s = parseInt(hex, 16).toString(2);
    // This adds zeroes in front to make them 8 bits long
    while (s.length < 8) {
        s = '0' + s;
    } return s;
}
// Convert a binary string to an integer
function toInt(binary) {
    return parseInt(parseInt(binary, 2).toString(10));
}
// Decode a 32-bit binary floating point number
function toFloatBinary(binary = '') {
    const sign = binary.substring(0, 1);
    const exponent = toInt(binary.substring(1, 9)) - 127;
    const fraction = binary.substring(9);
    const arr = fraction.split('');
    let float = 1.0;
    for (let i = 1; i <= fraction.length; i++) {
        const fraction = parseFloat(arr[i - 1]) * Math.pow(2, -i);
        float += fraction;
    }
    const power = Math.pow(2, exponent);
    float *= power;
    if (sign == '1') float *= -1;
    return float;
}
// Decode a 64-bit binary floating point number
function toDoubleBinary(binary = '') {
    const sign = binary.substring(0, 1);
    const exponent = toInt(binary.substring(1, 12)) - 1023;
    const fraction = binary.substring(12);
    const arr = fraction.split('');
    let float = 1.0;
    for (let i = 1; i <= fraction.length; i++) {
        const fraction = parseFloat(arr[i - 1]) * Math.pow(2, -i);
        float += fraction;
    }
    const power = Math.pow(2, exponent);
    float *= power;
    if (sign == '1') float *= -1;
    return float;
}


// Reads a GTFS-realtime protocol buffer, decodes it, and returns the decoded GTFS as a JSON object
async function test(url) {
    let protobufferstr = ''; // Accumulator string that stores the hex codes
    // Fetch the protocol buffer file from a website using the http / https node modules
    const https = require(`${url.substring(0, url.indexOf(':'))}`);
    https.get(url, response => {
        // When it receives data, split it to a hex array and add it to the accumulator string
        response.on('data', (data) => {
            const hex = data.toString('hex').split('');
            let c = 0;
            for (const char of hex) {
                c++;
                protobufferstr += char;
                if (c % 2 == 0) {
                    protobufferstr += ' ';
                }
            }
        });
    });
    // A short delay is needed because the data comes in multiple parts for some reason
    setTimeout(() => {
        const decoder = require('./protodecoder.js');
        const protobufferarr = protobufferstr.split(' ');
        // Decode the protocol buffer, save it in a JSON object
        const gtfs = decoder.decode(protobufferarr, decoder.formatGTFS);
        // Save the JSON in a local file
        const fs = require('fs');
        fs.writeFileSync(`gtfs-realtime.json`, JSON.stringify(gtfs));
        // Return the decoded JSON object
        return gtfs;
    }, 1000);
}
// Start the decoder testing program
//test('https://opendata.hamilton.ca/gtfs-rt/GTFS_TripUpdates.pb');

/* Useful sites:
https://protogen.marcgravell.com/decode
https://developers.google.com/protocol-buffers/docs/encoding
https://developers.google.com/transit/gtfs-realtime/reference
*/