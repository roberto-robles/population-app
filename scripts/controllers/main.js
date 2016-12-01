'use strict';

/**
 * @ngdoc function
 * @name myappApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the myappApp
 */
angular.module('myappApp')
    .controller('MainCtrl', ['$scope', '$timeout', function ($scope, $timeout) {
        $scope.filteredCountries = [];

        $scope.countries = [];
        
        $scope.dropdownSettings = {
            displayProp: 'name',
            idProp: 'id',
            externalIdProp: '' // This is used to ensure that we move the whole object properties
        };

        $scope.chartTypes = [{label: 'line'},
                             {label: 'scatter'},
                             {label: 'area'}]
        $scope.chartTypeEvents = {
            onItemSelect: function (e) {
                console.log(e);
                console.log($scope.chartTypeSelected);
                $scope.chartTypeSelected = {label: e.id}
                $scope.mutateChart();
            }};

        $scope.countriesEvents = {
            onItemSelect: function(e) {
                console.log(e);
                $scope.updateChart();
            },
            onItemDeselect: function (e) {
                console.log(e);
                $scope.updateChart();
            }
        }
        
        $scope.chartTypeSettings = {selectionLimit: 1,
                                    idProp: 'label'};

       
        $scope.chartTypeSelected = [{label: 'line'}];
        $scope.db = new PouchDB('world-pop');
            
        $scope.setupDB = function () {
            $.get('/data/world-pop.csv', function(result) {
                var rows = result.split('\n');
                var header = rows[0].split(',');

                console.dir(rows);
                $scope.headers = header;
                // rows.length
                for (var i = 1; i < (rows.length - 1); i ++) {
                    var name = rows[i].split(/,\S/)[0];
                    var codeRE = /[A-ZA-ZA-Z]{3}/g;
                    var code = codeRE.exec(rows[i])[0];
                    var populationString = rows[i].split(/.*[A-ZA-ZA-Z]{3},/g)[1];
                    var row = populationString.split(/,/);
                    var doc = {_id: code,
                               name: name,
                               population: {},
                               population_array: []};
                    // for(var j = 2; j < header.length; j++){ 
                    //     var value = parseFloat(row[j]);
                    //     doc.population[header[j]] = value;
                    //     doc.population_array.push(value);
                    // }
                    for (var j = 0; j < row.length; j++) {
                        var value = parseFloat(row[j]);
                        doc.population[header[j + 2]] = value;
                        doc.population_array.push(value);
                    }
                    // If somehow the row doesn't have country code we skip it
                    // on the import
                    if (doc._id) {
                        $scope.db.put(doc).then(function(response){
                            console.log("New record: " + response);
                        }).catch(function(err){
                            console.log("Record already exists: " + err);
                        });
                    }
                }
                
                setTimeout(function(){
                    $scope.fetchData();
                }, 1500);
                
            });
        };

        
        $scope.bindData = function(data) {
            var results = data.rows;
            // Hate do this hack for getting the name on the first level
            for (var i = 0; i < results.length; i ++) {
                results[i].name = results[i].doc.name;
            }
            
            console.dir(results);
            $scope.countries = results.slice();
            $scope.filteredCountries = results.slice();
            $scope.initChart(false);
            $scope.$apply();
        }

        $scope.fetchData = function () {
            // Get all raw docs
            $scope.db.allDocs(
                {
                    include_docs: true,
                    attachments: true
                }).then( function(result) {
                    $scope.bindData(result);
                }).catch( function (err) {
                    console.log(err); 
                });

        }
        // For debugging
        $scope.purgeData = function() {
            $scope.db.destroy().then(
                function(r) {
                    console.log("Delete" + r)
                }).catch(
                    function(err){
                        console.log(err)
                    });
        };
        $scope.dumbFilter = function (v) {return v != "Country Code"};
        $scope.debug = function() {
            console.log($scope.countries.length);
            console.log($scope.filteredCountries.length);
            console.dir($scope.filteredCountries);
        }
        // Chart handler

        $scope.initChart = function (isUpdate) {
            var chartType = 'line';
            if ($scope.chartTypeSelected) {
                chartType = $scope.chartTypeSelected.label;
            }
            
            var columns = [];
            var labels = _.range(1960, 2012);
            labels.unshift('x');
            for (var i = 0; i < $scope.filteredCountries.length; i ++) {
                var col = $scope.filteredCountries[i].doc.population_array;
                col.unshift($scope.filteredCountries[i].name);
                columns[i] = col;
            }

            columns.push(labels)
            if (!isUpdate) {
                $scope.chart = c3.generate({
                    bindto: '#chart',
                    size: {
                        height: 1300
                    },
                    tooltip: {
                        show: false
                    },
                    data: {
                        x: 'x',
                        columns: columns,
                        type: chartType,
                        selection: {
                            draggable: true,
                            enabled: true,
                            multiple: true
                        },
                        onselected: function (d) {
                            var logData = "Country: " + d.id + "\n";
                            logData += "Value: " + d.value + "\n";
                            logData += "Year:" + d.x;
                            console.log(logData)}
                    },
                    axis: {
                        x: {
                            tick: {
                                // this also works for non timeseries data
                                values: [1960, 1970, 1980, 1990, 2000, 2011]
                            }
                        }
                    }
                });
            } else {
                $scope.chart.unload();
                $timeout(function(){
                    console.log('Updating chart ' + columns.length);
                    $scope.chart.load({columns: columns});
                }, 10)
            }
            
            
        };

        $scope.updateChart = function () {
            $scope.initChart(true);
        };

        $scope.mutateChart = function () {
            $scope.chart.transform($scope.chartTypeSelected.label);
        }
        
        // Initialization
        $scope.setupDB();
	  }]);
