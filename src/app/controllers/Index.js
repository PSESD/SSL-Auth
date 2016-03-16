'use strict';
/**
 * Created by zaenal on 20/05/15.
 */
var Index = {

    index: function(req, res){

        res.json({ "test": res.__('welcome')});

    }

};

module.exports = Index;