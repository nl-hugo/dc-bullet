/*!
 *  dc.bulletChart
 *  version 0.0.1
 *  http://github.com/nl-hugo/dc-bullet
 *  
 *  extends dc.js: http://dc-js.github.io/dc.js/
 *  
 *  adds function markerAccessor, cappedMarkerAccessor, createMarkers, updateMarkers
 *  
 */
dc.bulletChart = function(parent, chartGroup) {
	
    var _g;

    var _labelOffsetX = 10;
    var _labelOffsetY = 15;
    var _titleLabelOffsetX = 2;

    var _gap = 5;

    var _fixedBarHeight = false;
    var _rowCssClass = "row";
    var _titleRowCssClass = "titlerow";
    var _renderTitleLabel = false;

    var _chart = dc.rowChart(),
		_markerAccessor;
    
    var _x;

    var _elasticX;

    var _xAxis = d3.svg.axis().orient("bottom");

    var _rowData;

    _chart.rowsCap = _chart.cap;
    
    _chart.markerAccessor = function (_) {
        if (!arguments.length) return _markerAccessor;
        _markerAccessor = _;
        return _chart;
    };
    
    _chart.cappedMarkerAccessor = function(d,i) {
        if (d.others)
            return d.value;
        return _chart.markerAccessor()(d,i);
    };

    function calculateAxisScale() {
        if (!_x || _elasticX) {
            var valExtent = d3.extent(_rowData, _chart.cappedValueAccessor);
            var markExtent = d3.extent(_rowData, _chart.cappedMarkerAccessor);
            var extent = d3.extent(valExtent.concat(markExtent));
            if (extent[0] > 0) extent[0] = 0;
            _x = d3.scale.linear().domain(extent)
                .range([0, _chart.effectiveWidth()]);
        }
        _xAxis.scale(_x);
    }

    function drawAxis() {
        var axisG = _g.select("g.axis");

        calculateAxisScale();

        if (axisG.empty())
            axisG = _g.append("g").attr("class", "axis")
                .attr("transform", "translate(0, " + _chart.effectiveHeight() + ")");

        dc.transition(axisG, _chart.transitionDuration())
            .call(_xAxis);
    }
    
    _chart._doRender = function () {
        _chart.resetSvg();

        _g = _chart.svg()
            .append("g")
            .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");

        drawChart();

        return _chart;
    };

    _chart.title(function (d) {
        return _chart.cappedKeyAccessor(d) + ": " + _chart.cappedValueAccessor(d);
    });

    _chart.label(_chart.cappedKeyAccessor);

    _chart.x = function(x){
        if(!arguments.length) return _x;
        _x = x;
        return _chart;
    };

    function drawGridLines() {
        _g.selectAll("g.tick")
            .select("line.grid-line")
            .remove();

        _g.selectAll("g.tick")
            .append("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", function () {
                return -_chart.effectiveHeight();
            });
    }

    function drawChart() {
        _rowData = _chart.data();

        drawAxis();
        drawGridLines();

        var rows = _g.selectAll("g." + _rowCssClass)
            .data(_rowData);

        createElements(rows);
        removeElements(rows);
        updateElements(rows);
    }

    function createElements(rows) {
        var rowEnter = rows.enter()
            .append("g")
            .attr("class", function (d, i) {
                return _rowCssClass + " _" + i;
            });

        rowEnter.append("rect").attr("width", 0);

        createLabels(rowEnter);
        createMarkers(rowEnter);
        updateLabels(rows);
        updateMarkers(rows);
    }

    function createMarkers(rowEnter) {
    	
    	rowEnter.selectAll("marker").remove();
    	
        var n = _rowData.length;

        var height;
        if (!_fixedBarHeight) height = (_chart.effectiveHeight() - (n + 1) * _gap) / n;
            else height = _fixedBarHeight;

        rowEnter.append("line").attr("class", "marker")
    		.attr("y1", 0)
    		.attr("y2", height);
    }
    
    function updateMarkers(rows) {
    	
    	var markers = rows.select(".marker");
    	
        dc.transition(markers, _chart.transitionDuration())
        .attr("x1", function (d) {
            var start = _x(0) == -Infinity ? _x(1) : _x(0);
            return Math.abs(start - _x(_chart.markerAccessor()(d)));
        })
        .attr("x2", function (d) {
            var start = _x(0) == -Infinity ? _x(1) : _x(0);
            return Math.abs(start - _x(_chart.markerAccessor()(d)));
        })
        .attr("transform", translateX);
    }
    
    function removeElements(rows) {
        rows.exit().remove();
    }

    function updateElements(rows) {
        var n = _rowData.length;

        var height;
        if (!_fixedBarHeight) height = (_chart.effectiveHeight() - (n + 1) * _gap) / n;
            else height = _fixedBarHeight;

        var rect = rows.attr("transform",function (d, i) {
                return "translate(0," + ((i + 1) * _gap + i * height) + ")";
            }).select("rect")
            .attr("height", height)
            .attr("fill", _chart.getColor)
            .on("click", onClick)
            .classed("deselected", function (d) {
                return (_chart.hasFilter()) ? !isSelectedRow(d) : false;
            })
            .classed("selected", function (d) {
                return (_chart.hasFilter()) ? isSelectedRow(d) : false;
            });

        dc.transition(rect, _chart.transitionDuration())
            .attr("width", function (d) {
                var start = _x(0) == -Infinity ? _x(1) : _x(0);
                return Math.abs(start - _x(_chart.valueAccessor()(d)));
            })
            .attr("transform", translateX);

        createTitles(rows);
        updateLabels(rows);
        updateMarkers(rows);
    }

    function createTitles(rows) {
        if (_chart.renderTitle()) {
            rows.selectAll("title").remove();
            rows.append("title").text(_chart.title());
        }
    }

    function createLabels(rowEnter) {
        if (_chart.renderLabel()) {
            rowEnter.append("text")
                .on("click", onClick);
        }
        if (_chart.renderTitleLabel()) {
            rowEnter.append("text")
                .attr("class", _titleRowCssClass)
                .on("click", onClick);
        }
    }

    function updateLabels(rows) {
        if (_chart.renderLabel()) {
            var lab = rows.select("text")
                .attr("x", _labelOffsetX)
                .attr("y", _labelOffsetY)
                .on("click", onClick)
                .attr("class", function (d, i) {
                    return _rowCssClass + " _" + i;
                })
                .text(function (d) {
                    return _chart.label()(d);
                });
            dc.transition(lab, _chart.transitionDuration())
                .attr("transform", translateX);
        }
        if (_chart.renderTitleLabel()) {
            var titlelab = rows.select("." + _titleRowCssClass)
                    .attr("x", _chart.effectiveWidth() - _titleLabelOffsetX)
                    .attr("y", _labelOffsetY)
                    .attr("text-anchor", "end")
                    .on("click", onClick)
                    .attr("class", function (d, i) {
                        return _titleRowCssClass + " _" + i ;
                    })
                    .text(function (d) {
                        return _chart.title()(d);
                    });
            dc.transition(titlelab, _chart.transitionDuration())
                .attr("transform", translateX);
        }
    }

    /**
    #### .renderTitleLabel(boolean)
    Turn on/off Title label rendering (values) using SVG style of text-anchor 'end'

    **/
    
    _chart.renderTitleLabel = function (_) {
        if (!arguments.length) return _renderTitleLabel;
        _renderTitleLabel = _;
        return _chart;
    };

    function onClick(d) {
        _chart.onClick(d);
    }

    function translateX(d) {
        var x = _x(_chart.cappedValueAccessor(d)),
            x0 = _x(0),
            s = x > x0 ? x0 : x;
        return "translate("+s+",0)";
    }

    _chart._doRedraw = function () {
        drawChart();
        return _chart;
    };

    /**
    #### .xAxis()
    Get the x axis for the row chart instance.  Note: not settable for row charts.
    See the [d3 axis object](https://github.com/mbostock/d3/wiki/SVG-Axes#wiki-axis) documention for more information.
    ```js
    // customize x axis tick format
    chart.xAxis().tickFormat(function(v) {return v + "%";});
    // customize x axis tick values
    chart.xAxis().tickValues([0, 100, 200, 300]);
    ```

    **/
    
    _chart.xAxis = function () {
        return _xAxis;
    };

    /**
    #### .fixedBarHeight([height])
    Get or set the fixed bar height. Default is [false] which will auto-scale bars.
    For example, if you want to fix the height for a specific number of bars (useful in TopN charts)
    you could fix height as follows (where count = total number of bars in your TopN and gap is your vertical gap space).
    ```js
     chart.fixedBarHeight( chartheight - (count + 1) * gap / count);
    ```
    **/
    _chart.fixedBarHeight = function (g) {
        if (!arguments.length) return _fixedBarHeight;
        _fixedBarHeight = g;
        return _chart;
    };

    /**
    #### .gap([gap])
    Get or set the vertical gap space between rows on a particular row chart instance. Default gap is 5px;

    **/
    _chart.gap = function (g) {
        if (!arguments.length) return _gap;
        _gap = g;
        return _chart;
    };

    /**
    #### .elasticX([boolean])
    Get or set the elasticity on x axis. If this attribute is set to true, then the x axis will rescle to auto-fit the data
    range when filtered.

    **/
    _chart.elasticX = function (_) {
        if (!arguments.length) return _elasticX;
        _elasticX = _;
        return _chart;
    };

    /**
    #### .labelOffsetX([x])
    Get or set the x offset (horizontal space to the top left corner of a row) for labels on a particular row chart. Default x offset is 10px;

    **/
    _chart.labelOffsetX = function (o) {
        if (!arguments.length) return _labelOffsetX;
        _labelOffsetX = o;
        return _chart;
    };

    /**
    #### .labelOffsetY([y])
    Get or set the y offset (vertical space to the top left corner of a row) for labels on a particular row chart. Default y offset is 15px;

    **/
    _chart.labelOffsetY = function (o) {
        if (!arguments.length) return _labelOffsetY;
        _labelOffsetY = o;
        return _chart;
    };

    /**
    #### .titleLabelOffsetx([x])
    Get of set the x offset (horizontal space between right edge of row and right edge or text.   Default x offset is 2px;

    **/
    _chart.titleLabelOffsetX = function (o) {
        if (!arguments.length) return _titleLabelOffsetX;
        _titleLabelOffsetX = o;
        return _chart;
    };

    function isSelectedRow (d) {
        return _chart.hasFilter(_chart.cappedKeyAccessor(d));
    }

    return _chart.anchor(parent, chartGroup);;
}