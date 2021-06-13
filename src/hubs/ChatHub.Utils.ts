export class ChatHubUtils {
  public static CallIfFunction(fn?: Function, ...params: any) {
    if(typeof fn === 'function') {
      fn(...params);
    }
  }
}
