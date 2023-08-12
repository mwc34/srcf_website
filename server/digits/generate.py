import json
import os
import sys
import numpy as np
import itertools

PATH = os.path.dirname(__file__)

def validate_problem(numbers, target, find_shortest=False):
    solution = None
    # Loop over every pair of numbers
    for i in itertools.combinations(range(len(numbers)), 2):
        new_numbers = list(numbers)
        # Get a & b, the pair of numbers
        a = new_numbers[i[0]]
        b = new_numbers.pop(i[1])
        
        # Loop over every valid operation
        results = [a+b, abs(a-b), a*b]
        if b != 0 and a/b == a//b:
            results.append(a/b)
        if a != 0 and b/a == b//a and a != b:
            results.append(b/a)
        for idx, result in enumerate(results):
            move = [a, b, idx]
            # If reached target, we're done
            if result == target:
                return [move]
            else:
                # Replace the two numbers with result and recurse
                new_numbers[i[0]] = result
                t = validate_problem(new_numbers, target, find_shortest)
                if t:
                    if find_shortest:
                        # -1 because solution will have [move] in but t will not
                        if solution is None or len(t) < len(solution)-1:
                            solution = [move] + t
                    else:
                        return [move] + t
                        
    return solution or False
    
    
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
    