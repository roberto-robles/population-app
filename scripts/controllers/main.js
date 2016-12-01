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
        /*
         Setup of NgDropdown directive for the widget that helps on do country filtering
        */
        console.log(new Date());
        $scope.filteredCountries = [];
        $scope.countries = [];
        $scope.dropdownSettings = {
            scrollable: true,
            showUncheckAll: false,
            showCheckAll: false,
            displayProp: 'name',
            idProp: '_id',
            externalIdProp: '' // This is used to ensure that we move the whole object properties
        };

        $scope.countriesEvents = {
            onItemSelect: function(e) {
                // console.log(e);
                $scope.updateChart();
            },
            onItemDeselect: function (e) {
                // console.log(e);
                $scope.updateChart();
            }
        };
        
        /*
         Binding for NgDropdown that handles the chart type selector
         */
        $scope.chartTypes = [{id: 1, label: 'line'},
                             {id: 2, label: 'scatter'},
                             {id: 3, label: 'area'}]
        $scope.chartTypeEvents = {
            onItemSelect: function (e) {
                // console.log(e);
                // console.log($scope.chartTypeSelected);
                $scope.chartTypeSelected = {label: e.label}
                $scope.mutateChart();
            }};

        
        $scope.chartTypeSettings = {
            showUncheckAll: false,
            showCheckAll: false,
            selectionLimit: 1,
            idProp: 'label',
            externalIdProp: ''
        };

       
        $scope.chartTypeSelected = [{label: 'line'}];

        // $scope.db = new PouchDB('world-pop');

        // Our storage of values using a JSObj
        $scope.objDB = [];
        
        $scope.setupDB = function () {
            $.get('/data/world-pop.csv', function(result) {
                var rows = result.split('\n');
                var header = rows[0].split(',');
                $scope.headers = header;
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

                    for (var j = 0; j < row.length; j++) {
                        var value = parseFloat(row[j]);
                        doc.population[header[j + 2]] = value;
                        doc.population_array.push(value);
                    }
                    if (doc._id) {
                        // Try to use pouchDB but it was slower than using a
                        // row JS obj
                        // $scope.db.put(doc).then(function(response){
                        //     console.log("New record: " + response);
                        // }).catch(function(err){
                        //     console.log("Record already exists: " + err);
                        // });
                        $scope.objDB.push(doc);
                    }
                }
                console.log(new Date());
                $scope.fetchData();
                // setTimeout(function(){
                //     $scope.fetchData();
                // }, 1500);
                
            });
        };

        
        $scope.bindData = function(data) {
            var results = data;
            $scope.countries = results.slice();
            $scope.filteredCountries = results.slice(); //[results.slice()[0]];
            // console.log('beforeinitChart' + new Date());
            $scope.initChart(false);
            $scope.$apply();
        }

        $scope.fetchData = function () {
            // Get all raw docs
            // $scope.db.allDocs(
            //     {
            //         include_docs: true,
            //         attachments: true
            //     }).then( function(result) {
            //         $scope.bindData(result);
            //     }).catch( function (err) {
            //         console.log(err); 
            //     });
            $scope.bindData($scope.objDB);

        }
        // For debugging
        // $scope.purgeData = function() {
        //     $scope.db.destroy().then(
        //         function(r) {
        //             console.log("Delete" + r)
        //         }).catch(
        //             function(err){
        //                 console.log(err)
        //             });
        // };

        $scope.dumbFilter = function (v) {return v != "Country Code"};

        $scope.debug = function() {
            console.log($scope.countries.length);
            console.log($scope.filteredCountries.length);
            console.dir($scope.filteredCountries);
        }
        
        /* Chart handler
           initChart handles the initialization and updates to the chart obj;
           @param isUpdate: boolean true for just setting the columns values
                                    false for creating the chart Object and bind it
                                    to the context
         */
        $scope.initChart = function (isUpdate) {
            var chartType = 'line';
            if ($scope.chartTypeSelected) {
                chartType = $scope.chartTypeSelected.label;
            }
            
            var columns = [];
            var labels = _.range(1960, 2012);
            labels.unshift('x');
            for (var i = 0; i < $scope.filteredCountries.length; i ++) {
                var col = $scope.filteredCountries[i].population_array;
                col.unshift($scope.filteredCountries[i].name);
                columns[i] = col;
            }

            columns.push(labels)
            if (!isUpdate) {
                $scope.chart = c3.generate({
                    bindto: '#chart',
                    size: {
                        height: 600
                    },
                    tooltip: {
                        show: false
                    },
                    transition: {
                        duration: 200
                    },
                    legend: {
                        hide: true
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
                            console.log(logData);
                            $scope.info = logData;
                            $scope.$apply();
                        }
                        
                    },
                    axis: {
                        x: {
                            tick: {
                                values: [1960, 1970, 1980, 1990, 2000, 2011]
                            }
                        },
                        y: {
                            min: 0,
                            max: 7000000000, // this limit is used so we don't lose proportion
                            padding: {
                                bottom: 0
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

            console.log('afterinitChart' + new Date());
            
            
        };

        
        $scope.updateChart = function () {
            $scope.initChart(true);
        };

        /* Chart handler
           mutateChart is used to change the type of the chart based on the value
           that has been binded to $scope.chartTypeSelected.label
         */
        $scope.mutateChart = function () {
            $scope.chart.transform($scope.chartTypeSelected.label);
        }
        
        // Initialization
        $scope.setupDB();
	  }]);
