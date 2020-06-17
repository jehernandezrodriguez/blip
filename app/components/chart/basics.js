import React, { Component } from 'react';
import _ from 'lodash';
import bows from 'bows';
import sundial from 'sundial';
import { translate, Trans } from 'react-i18next';

// tideline dependencies & plugins
import tidelineBlip from 'tideline/plugins/blip';
const BasicsChart = tidelineBlip.basics;

import { components as vizComponents, utils as vizUtils } from '@tidepool/viz';
const { ClipboardButton, Loader } = vizComponents;
const { basicsText } = vizUtils.text;

import { isMissingBasicsData } from '../../core/data';

import Stats from './stats';
import BgSourceToggle from './bgSourceToggle';
import Header from './header';
import Footer from './footer';

class Basics extends Component {
  static propTypes = {
    aggregations: React.PropTypes.object.isRequired,
    chartPrefs: React.PropTypes.object.isRequired,
    data: React.PropTypes.object.isRequired,
    initialDatetimeLocation: React.PropTypes.string,
    loading: React.PropTypes.bool.isRequired,
    onClickRefresh: React.PropTypes.func.isRequired,
    onClickNoDataRefresh: React.PropTypes.func.isRequired,
    onSwitchToBasics: React.PropTypes.func.isRequired,
    onSwitchToDaily: React.PropTypes.func.isRequired,
    onClickPrint: React.PropTypes.func.isRequired,
    onSwitchToSettings: React.PropTypes.func.isRequired,
    onSwitchToBgLog: React.PropTypes.func.isRequired,
    onUpdateChartDateRange: React.PropTypes.func.isRequired,
    patient: React.PropTypes.object.isRequired,
    pdf: React.PropTypes.object.isRequired,
    stats: React.PropTypes.array.isRequired,
    permsOfLoggedInUser: React.PropTypes.object.isRequired,
    trackMetric: React.PropTypes.func.isRequired,
    updateBasicsSettings: React.PropTypes.func.isRequired,
    updateChartPrefs: React.PropTypes.func.isRequired,
    uploadUrl: React.PropTypes.string.isRequired,
  };

  static displayName = 'Basics';

  constructor(props) {
    super(props);
    this.chartType = 'basics';
    this.log = bows('Basics View');

    this.state = this.getInitialState();
  }

  getInitialState = () => ({
    atMostRecent: true,
    inTransition: false,
    title: this.getTitle(),
  });

  render = () => {
    const { t } = this.props;
    const dataQueryComplete = _.get(this.props, 'data.query.chartType') === 'basics';
    let renderedContent;

    if (dataQueryComplete) {
      renderedContent = this.isMissingBasics() ? this.renderMissingBasicsMessage() : this.renderChart();
    }

    return (
      <div id="tidelineMain" className="basics">
        <Header
          chartType={this.chartType}
          patient={this.props.patient}
          printReady={!!this.props.pdf.url}
          atMostRecent={true}
          inTransition={this.state.inTransition}
          title={this.state.title}
          onClickBasics={this.handleClickBasics}
          onClickOneDay={this.handleClickOneDay}
          onClickTrends={this.handleClickTrends}
          onClickRefresh={this.props.onClickRefresh}
          onClickSettings={this.props.onSwitchToSettings}
          onClickBgLog={this.handleClickBgLog}
          onClickPrint={this.handleClickPrint}
        ref="header" />
        <div className="container-box-outer patient-data-content-outer">
          <div className="container-box-inner patient-data-content-inner">
            <div className="patient-data-content">
              <Loader show={!!this.refs.chart && this.props.loading} overlay={true} />
              {renderedContent}
            </div>
          </div>
          <div className="container-box-inner patient-data-sidebar">
            <div className="patient-data-sidebar-inner">
              <div>
                <ClipboardButton
                  buttonTitle={t('For email or notes')}
                  onSuccess={this.handleCopyBasicsClicked}
                  getText={basicsText.bind(this, this.props.patient, this.props.data, this.props.stats, this.props.aggregations)}
                />
                <BgSourceToggle
                  bgSources={_.get(this.props, 'data.metaData.bgSources', {})}
                  chartPrefs={this.props.chartPrefs}
                  chartType={this.chartType}
                  onClickBgSourceToggle={this.toggleBgDataSource}
                />
                <Stats
                  bgPrefs={_.get(this.props, 'data.bgPrefs', {})}
                  chartPrefs={this.props.chartPrefs}
                  stats={this.props.stats}
                />
              </div>
            </div>
          </div>
        </div>
        <Footer
          chartType={this.chartType}
          onClickRefresh={this.props.onClickRefresh}
          ref="footer"
        />
      </div>
      );
  };

  renderChart = () => {
    return (
      <div id="tidelineContainer" className="patient-data-chart-growing">
        <BasicsChart
          aggregations={this.props.aggregations}
          bgClasses={_.get(this.props, 'data.bgPrefs', {}).bgClasses}
          bgUnits={_.get(this.props, 'data.bgPrefs', {}).bgUnits}
          data={this.props.data}
          onSelectDay={this.handleSelectDay}
          patient={this.props.patient}
          permsOfLoggedInUser={this.props.permsOfLoggedInUser}
          timePrefs={_.get(this.props, 'data.timePrefs', {})}
          updateBasicsSettings={this.props.updateBasicsSettings}
          ref="chart"
          trackMetric={this.props.trackMetric} />
      </div>
    );
  };

  renderMissingBasicsMessage = () => {
    const self = this;
    const { t } = this.props;
    const handleClickUpload = function() {
      self.props.trackMetric('Clicked Partial Data Upload, No Pump Data for Basics');
    };

    return (
      <Trans className="patient-data-message patient-data-message-loading" i18nKey="html.basics-no-uploaded-data">
        <p>The Basics view shows a summary of your recent device activity, but it looks like you haven't uploaded device data yet.</p>
        <p>To see the Basics, <a
            href={this.props.uploadUrl}
            target="_blank"
            onClick={handleClickUpload}>upload</a> some device data.</p>
        <p>If you just uploaded, try <a href="" onClick={this.props.onClickNoDataRefresh}>refreshing</a>.
        </p>
      </Trans>
    );
  };

  getTitle = () => {
    const { t } = this.props;
    if (this.isMissingBasics()) {
      return '';
    }

    const timePrefs = _.get(this.props, 'data.timePrefs', {});
    let timezone;
    if (!timePrefs.timezoneAware) {
      timezone = 'UTC';
    }
    else {
      timezone = timePrefs.timezoneName || 'UTC';
    }

    const dtMask = t('MMM D, YYYY');
    return sundial.formatInTimezone(_.get(this.props, 'data.data.current.endpoints.range', [])[0], timezone, dtMask) +
      ' - ' + sundial.formatInTimezone(_.get(this.props, 'data.data.current.endpoints.range', [])[1] - 1, timezone, dtMask);
  }

  isMissingBasics = () => {
    const aggregationsByDate = _.get(this.props, 'data.data.aggregationsByDate', {});
    return isMissingBasicsData(aggregationsByDate);
  };

  // handlers
  toggleBgDataSource = (e, bgSource) => {
    if (e) {
      e.preventDefault();
    }

    const bgSourceLabel = bgSource === 'cbg' ? 'CGM' : 'BGM';
    this.props.trackMetric(`Basics Click to ${bgSourceLabel}`);

    const prefs = _.cloneDeep(this.props.chartPrefs);
    prefs.basics.bgSource = bgSource;
    this.props.updateChartPrefs(prefs, false, true);
  };

  handleClickBasics = e => {
    if (e) {
      e.preventDefault();
    }
    return;
  };

  handleClickTrends = e => {
    if (e) {
      e.preventDefault();
    }
    this.props.onSwitchToTrends(_.get(this.props, 'data.data.current.endpoints.range', [])[1]);
  };

  handleClickOneDay = e => {
    if (e) {
      e.preventDefault();
    }
    this.props.onSwitchToDaily(_.get(this.props, 'data.data.current.endpoints.range', [])[1]);
  };

  handleClickPrint = e => {
    if (e) {
      e.preventDefault();
    }

    this.props.onClickPrint(this.props.pdf);
  };

  handleClickBgLog = e => {
    if (e) {
      e.preventDefault();
    }
    this.props.onSwitchToBgLog(_.get(this.props, 'data.data.current.endpoints.range', [])[1]);
  };

  handleSelectDay = (date, title) => {
    this.props.onSwitchToDaily(date, title);
  };

  handleCopyBasicsClicked = () => {
    this.props.trackMetric('Clicked Copy Settings', { source: 'Basics' });
  };
};

export default translate()(Basics);
