import {
	Chart,
	LineController,
	LineElement,
	PointElement,
	BarController,
	BarElement,
	LinearScale,
	CategoryScale,
	Tooltip,
	Legend
} from 'chart.js';

Chart.register(
	LineController,
	LineElement,
	PointElement,
	BarController,
	BarElement,
	LinearScale,
	CategoryScale,
	Tooltip,
	Legend
);

// Chart.js defaults assume a light background; repoint text/grid colors for our dark theme.
Chart.defaults.color = '#a39c8f';
Chart.defaults.borderColor = 'rgba(242, 239, 232, 0.08)';

export { Chart };
