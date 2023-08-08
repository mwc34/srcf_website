import json
import os
import sys
import numpy as np
import itertools

PATH = os.path.dirname(__file__)

def validate_problem(numbers, target):
    for i in itertools.combinations(range(len(numbers)), 2):
        new_numbers = list(numbers)
        a = new_numbers[i[0]]
        b = new_numbers.pop(i[1])
        
        results = [a+b, a-b, a*b]
        if b != 0:
            results.append(a/b)
        for idx, result in enumerate(results):
            move = [a, b, idx]
            if result == np.nan:
                return False
            elif result == target:
                return [move]
            else:
                new_numbers[i[0]] = result
                t = validate_problem(new_numbers, target)
                if t:
                    return t + [move]
    return False
    
def generate_valid_problems(seed):
    gen = np.random.default_rng(seed)
    problems = []
    # Problem 1
    while True:
        target = gen.integers(51, 75).item()
        
        numbers = gen.choice(np.arange(1, 10), 4, False).tolist()
        numbers.extend([10, 25])
        if validate_problem(numbers, target):
            break
            
    problems.append({"numbers": sorted(numbers), "target": target})
    
    # Problem 2
    while True:
        target = gen.integers(101, 199).item()
        
        numbers = gen.choice(np.arange(1, 10), 4, False).tolist()
        numbers.extend([10, 15])
        if validate_problem(numbers, target):
            break
            
    problems.append({"numbers": sorted(numbers), "target": target})
    
    # Problem 3
    while True:
        target = gen.integers(201, 299).item()
        
        numbers = gen.choice(np.arange(1, 10), 4, False).tolist()
        numbers.extend(gen.choice(np.arange(11, 15), 1, False).tolist())
        numbers.extend([15])
        if validate_problem(numbers, target):
            break
            
    problems.append({"numbers": sorted(numbers), "target": target})
    
    # Problem 4
    while True:
        target = gen.integers(301, 399).item()
        
        numbers = gen.choice(np.arange(1, 10), 3, False).tolist()
        numbers.extend(gen.choice(np.arange(11, 15), 1).tolist())
        numbers.extend([15, 20])
        if validate_problem(numbers, target):
            break
            
    problems.append({"numbers": sorted(numbers), "target": target})
    
    # Problem 5
    while True:
        target = gen.integers(401, 499).item()
        
        numbers = gen.choice(np.arange(1, 10), 2, False).tolist()
        numbers.extend(gen.choice(np.arange(11, 15), 2, False).tolist())
        numbers.extend([20, 25])
        if validate_problem(numbers, target):
            break
            
    problems.append({"numbers": sorted(numbers), "target": target})
    
    return problems
    
if __name__ == "__main__":
    name = sys.argv[1]
    p = generate_valid_problems(list(name.encode("utf8")))
    os.makedirs(os.path.join(PATH, "starting_values"), exist_ok=True)
    with open(os.path.join(PATH, "starting_values", name + ".json"), "w") as fp:
        json.dump(p, fp)
    