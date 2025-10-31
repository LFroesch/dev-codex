# LeetCode Practice
Make Breakdown of Characteristics / How to Tell

## Two Sum

```Typescript
function twoSum(nums: number[], target: number): number[] {
    const seen: {[key: number]: number} = {};
    for (let i=0; i < nums.length; i++) {
        const complement = target - nums[i]
        if (complement in seen) {
            return [seen[complement], i]
        }
        seen[nums[i]] = i;
    }
    return [];
};
```

```Python
class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num

            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
```

## Digit Extraction / Number Reversal

```Typescript
function isPalindrome(x: number): boolean {
    if (x < 0 || (x % 10 == 0 && x != 0)) {
        return false;
    }
    let reversed = 0
    let copy = x
    while (copy > 0) {
        const lastDigit = copy % 10
        copy = Math.floor(copy / 10)
        reversed = reversed * 10 + lastDigit
    }
    return reversed === x
};
```

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        if x < 0 or (x % 10 == 0 and x != 0):
            return False
        
        reversed = 0
        copy = x
        while copy > 0:
            lastDigit = copy % 10
            reversed = 10 * reversed + lastDigit
            copy = copy // 10
        return reversed == x

```

OR

```python
class Solution:
    def isPalindrome(self, x: int) -> bool:
        # Negative numbers are not palindromes
        if x < 0:
            return False
        
        # Numbers ending with 0 but not 0 itself cannot be palindromes
        if x % 10 == 0 and x != 0:
            return False
        
        reversed_half = 0
        while x > reversed_half:
            reversed_half = reversed_half * 10 + x % 10
            x //= 10
        
        # For odd length numbers, reversed_half // 10 removes the middle digit
        return x == reversed_half or x == reversed_half // 10

```

## Hash Map / Dictionary + String Traversal

```python
class Solution:
    def romanToInt(self, s: str) -> int:
        roman_map = {
            "I": 1,
            "V": 5,
            "X": 10,
            "L": 50,
            "C": 100,
            "D": 500,
            "M": 1000
        }
        total = 0
        for i in range(len(s)):
            if i != len(s) - 1 and roman_map[s[i]] < roman_map[s[i+1]]:
                total -= roman_map[s[i]]
            else:
                total += roman_map[s[i]]
        return total

OR

class Solution:
    def romanToInt(self, s: str) -> int:
        n = 0
        values = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
        for i in range(len(s) - 1):
            curr, fut = values[s[i]], values[s[i + 1]]
            if curr < fut:
                n -= curr
            else:
                n += curr
            i += 1
        n += values[s[-1]]
        return n
```

```Typescript
function romanToInt(s: string): number {
    const romanMap: { [key: string]: number } = {
    'I': 1,
    'V': 5,
    'X': 10,
    'L': 50,
    'C': 100,
    'D': 500,
    'M': 1000
    };
    let n = 0
    for (let i = 0; i < s.length - 1; i++) {
        let curr = romanMap[s[i]]
        let fut = romanMap[s[i+1]]
        if (curr < fut) {
            n -= curr
        } else {
            n += curr
        }
    }
    n += romanMap[s[s.length-1]]
    return n
};
```

## Array / Prefix Sum

```Python
class Solution:
    def runningSum(self, nums: List[int]) -> List[int]:
        sumList = []
        for i in range(len(nums)):
            if i == 0:
                sumList.append(nums[i])
            else:
                sumList.append(nums[i] + sumList[i-1])
        return sumList
```

```Typescript
function runningSum(nums: number[]): number[] {
    let sumList = []
    for (let i = 0; i < nums.length; i++) {
        if (i === 0) {
            sumList[i] = nums[i]
        }
        else {
        sumList[i] = nums[i] + sumList[i-1]
        }
    }
    return sumList
};
```

## Matching / Pairing using Stack

```Python
class Solution:
    def isValid(self, s: str) -> bool:
        bracket_map = {')': '(', '}': '{', ']': '['}
        brackets_stack = []
        for i in range(len(s)):
            if s[i] not in bracket_map:
                brackets_stack.append(s[i])
            else:
                if len(brackets_stack) == 0:
                    return False
                else:
                    popped = brackets_stack.pop()
                    if popped != bracket_map[s[i]]:
                        return False
        return len(brackets_stack) == 0
```

```Typescript
function isValid(s: string): boolean {
    const stack: string[] = [];
    const bracket_map: { [key: string]: string } = {
        ')': '(',
        '}': '{',
        ']': '['
    };
    for (let i = 0; i < s.length; i++) {
        if (!(s[i] in bracket_map)) {
            stack.push(s[i])
        } else {
            if (s.length == 0) {
                return false
            } else {
                let popped = stack.pop()
                if (popped != bracket_map[s[i]]) {
                    return false
                }
            }
        }
    }
    return (stack.length == 0)
};
```

## Merge Sorted List

```Python
class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        current = dummy
        while list1 and list2:
            if list1.val < list2.val:
                current.next = list1
                list1 = list1.next
            else:
                current.next = list2
                list2 = list2.next
            current = current.next
        current.next = list2 or list1
        return dummy.next

OR

class Solution:
    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
        if not list1:
            return list2
        if not list2:
            return list1
        if list1.val < list2.val:
            list1.next=self.mergeTwoLists(list1.next,list2)
            return list1
        else:
            list2.next=self.mergeTwoLists(list1,list2.next)
            return list2
```

```Typescript
function mergeTwoLists(list1: ListNode | null, list2: ListNode | null): ListNode | null {
    let dummy = new ListNode(0);
    let current = dummy;
    while (list1 && list2) {
        if (list1.val < list2.val) {
            current.next = list1
            list1 = list1.next
        } else { 
            current.next = list2
            list2 = list2.next
        }
        current = current.next
    }
    current.next = list2 || list1

    return dummy.next
};
```

## Array / Prefix Sum

```Python
```

```Typescript
```

## Array / Prefix Sum

```Python
```

```Typescript
```
