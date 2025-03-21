import * as dashboard from '@grafana/grafana-foundation-sdk/dashboard';
import * as testdata from '@grafana/grafana-foundation-sdk/testdata';
import { PanelBuilder as TimeseriesBuilder } from '@grafana/grafana-foundation-sdk/timeseries';

function makeDashboard() {
  let builder = new dashboard.DashboardBuilder('Example dashboard')
    .uid('example-dashboard')
    .description('Example Dashboard for Grizzly')
    .tooltip(dashboard.DashboardCursorSync.Crosshair)
    .withPanel(
      new TimeseriesBuilder()
        .title('Requests / sec')
        .unit("reqps")
        .withTarget(
          new testdata.DataqueryBuilder()
            .queryType('randomWalk')
            .datasource({uid: "grafana", type: "grafana"})
        )
        .span(24)
        .height(8)
  );
  const dash = JSON.stringify(builder.build(), null, 2);
  return dash;
}

console.log(makeDashboard());