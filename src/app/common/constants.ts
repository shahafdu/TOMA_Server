export class Constants {
  public static courseSuffRegEx = /#\d+$/;
  public static courseSuffUrlRegEx = /&\d+$/;
  public static courseSuffWithYearRegEx = /#\d+\s\d{4}$/;

  // Make sure this is identical to the one in Emma!
  

  public static authorizationLevel2Num: { [key: string]: number } = {
    'None': 1,
    'All': 2,
    'PM': 3
  };

}
