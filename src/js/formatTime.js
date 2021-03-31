import $ from 'jquery';
import moment from 'moment';

$(document).ready(() => {
  const timeElements = $('time.convertDate');
  timeElements.each(function () {
    const dateText = $(this).text();
    const date = new Date(dateText);
    $(this).html(moment(date).calendar());
    $(this).attr('datetime', dateText);
  });
});
